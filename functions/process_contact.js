/**********************************************************************************************************************
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved                                            *
 *                                                                                                                    *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated      *
 *  documentation files (the "Software"), to deal in the Software without restriction, including without limitation   *
 *  the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and  *
 *  to permit persons to whom the Software is furnished to do so.                                                     *
 *                                                                                                                    *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO  *
 *  THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE    *
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF         *
 *  CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS *
 *  IN THE SOFTWARE.                                                                                                  *
 **********************************************************************************************************************/

'use strict';

console.log('Loading function');

const aws = require('aws-sdk');
const url = require("url");
const path = require("path");
const transcript_seg_table_name = process.env.transcript_seg_table_name;
const transcript_seg_to_customer_table_name = process.env.transcript_seg_to_customer_table_name;
const contact_table_name = process.env.contact_table_name;

const combinedBucket = process.env.combined_audio_bucket;
const lambdaFunc = process.env.merge_audio_lambda;

// S3 to check the two audio files
var s3bucket = new aws.S3();


exports.handler = (event, context, callback) => {
    console.log('Received event::', JSON.stringify(event, null, 2));

    // Get the object from the event and show its content type
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

    // set the download URL
    let recordingURL = `https://${bucket}.s3.amazonaws.com/${key}`;

    //get file name ie: ContactID
    var parsed = url.parse(recordingURL);
    var file = path.basename(parsed.pathname);
    var contactId = file.split('_')[0];
    console.log(`Received event for this contact ID: ${contactId}`);

    //Determine if File is AUDIO_FROM_CUSTOMER or TO_CUSTOMER
    let strAudioFromCustomer = "AUDIO_FROM_CUSTOMER";
    let strAudioToCustomer = "AUDIO_TO_CUSTOMER";

    let audioFromCustomer = key.includes(strAudioFromCustomer);
    let audioToCustomer = key.includes(strAudioToCustomer);
    
    if (audioFromCustomer){
        console.log("GOT AUDIO FROM CUSTOMER");
    }
    if (audioToCustomer){
        console.log("GOT AUDIO TO CUSTOMER");
    } 

    //Call Function to Combine Audio
    combineAudio( bucket,contactId,lambdaFunc, combinedBucket );

    getTranscript(contactId, transcript_seg_table_name)
        .then(result1 => {
            getTranscript(contactId, transcript_seg_to_customer_table_name)
            .then(result2 => {
                var contactTranscriptFromCustomer = result1;
                var contactTranscriptToCustomer = result2;
                //Checking if audioFromCustomer and setting up parameters for DynamoDB update 
                if (audioFromCustomer){
                //set up the database query to be used to update the customer information record in DynamoDB
                var paramsUpdate = {
                    TableName: contact_table_name,
                    Key: {
                        "contactId": contactId
                    },
                    
                    ExpressionAttributeValues: {
                        ":var1": contactTranscriptFromCustomer,
                        ":var2": recordingURL
                    },
                    //Updating audioFromCustomer field in DynamoDB with recording URL
                    UpdateExpression: "SET contactTranscriptFromCustomer = :var1, audioFromCustomer = :var2"
                };
            //Checking if audioToCustomer and setting up parameters for DynamoDB update 
            } else if (audioToCustomer) {
                //set up the database query to be used to update the customer information record in DynamoDB
                var paramsUpdate = {
                    TableName: contact_table_name,
                    Key: {
                        "contactId": contactId
                    },
                     
                    ExpressionAttributeValues: {
                        ":var1": contactTranscriptToCustomer,
                        ":var2": recordingURL
                    },
                    //Updating audioToCustomer field in DynamoDB with recording URL
                    UpdateExpression: "SET contactTranscriptToCustomer = :var1, audioToCustomer = :var2"
                };
                
                }

                //update the customer record in the database with the new call information using the paramsUpdate query we setup above:
                var docClient = new aws.DynamoDB.DocumentClient();
                docClient.update(paramsUpdate, function (err, data) {
                    if (err) {
                        console.log("Unable to update item. Error: ", JSON.stringify(err, null, 2));
                    } else {
                        console.log("Updated item succeeded: ", JSON.stringify(data, null, 2));
                    }

                });
                callback(null, "Success!");
            });
        });

};

function getTranscript(contactId, tableName) {
    return new Promise(function (resolve, reject) {
        var docClient = new aws.DynamoDB.DocumentClient();

        //set up the database query to be used to lookup customer information from DynamoDB
        var paramsQuery = {
            TableName: tableName,
            KeyConditionExpression: "ContactId = :varContactId",

            ExpressionAttributeValues: {
                ":varContactId": contactId
            }
        };

        console.log("querying ddb with: " + JSON.stringify(paramsQuery));

        //use the lookup query (paramsQuery) we set up to lookup the contact transcript segments from DynamoDB
        docClient.query(paramsQuery, (err, dbResults) => {
            //check to make sure the query executed correctly, if so continue, if not error out the lambda function
            if (err) {
                console.log(err);
                reject();
            }
            //if no error occured, proceed to process the results that came back from DynamoDB
            else {
                //log the results from the DynamoDB query
                var transcript = "";
                var results = dbResults.Items;

                for (var i = 0; i <= results.length - 1; i++) {
                    transcript += results[i].Transcript + " ";
                }

                if (transcript) {
                    transcript = transcript;
                } else transcript = "Transcript not available for this call";

                console.log("table (" + tableName +") has the transcript: " + transcript);
                resolve(transcript);
            }

        });
    });
}

// ---------------------------------------------------------------------------

function combineAudio(bucketName, contactIdent, lambdaFunc, combinedBucket)
{
        const lambda = new aws.Lambda();
        var bucketParams = {
        	Bucket: bucketName,
        	Delimiter: '/',
        	Prefix: 'recordings/' + contactIdent
        };

    
        
        // List files in starting with a specific Contact ID
        s3bucket.listObjects(bucketParams, function (err, data){
            if (err) {console.log(err,err.stack);}
            else {
                // Loop thru to find the To and From files
                for (let index = 0; index < data['Contents'].length; index++)
                {
            		//console.log(data['Contents'][index]['Key']);
                    var filename = data['Contents'][index]['Key'];
                    if (filename.includes('TO')) {
                        var fileTo = filename;
                    }
                    if (filename.includes('FROM')){
                            var fileFrom = filename;
                    }
            	}
            	// if both files are found proceed to call the merge audio streams
                if ( fileTo && fileFrom) {
                    console.log("Got both files invoke Lambda");
                    var dates = new Date();
                    var datesString = dates.toISOString();
                    var lambdaParams = {
                        FunctionName: lambdaFunc,
                        InvocationType: "Event",
                        Payload:JSON.stringify({
                            "sources": [{
                                "Bucket": bucketName,
                                "Key": fileTo
                            },
                            {
                                "Bucket": bucketName,
                                "Key": fileFrom
                            }],
                            "target": {
                                "Bucket": combinedBucket,
                                "Key": contactIdent + "_" + datesString + "_COMBINED_AUDIO.wav"
                            }
                        })
                    };
                    console.log(lambdaParams);
                    // Invoke merge audio files
                    lambda.invoke(lambdaParams, function(error, data){
                            console.log("error value" + error);
                            if (error) {console.log("Error invoking Lambda");}
                                else {console.log(data);}
                    });
                }
                else {
                    // If just one file is found, wait for the other file.
                    console.log("Waiting for the other file");
                }
            }
    });
}