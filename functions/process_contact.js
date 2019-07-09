/**********************************************************************************************************************
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved                                            *
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
const metricsHelper = require('./metricsHelper.js');
const metrics = process.env.METRICS;
const nodeUuid = require('uuid');
const uuid = nodeUuid.v4();

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

    getTranscript(contactId, transcript_seg_table_name)
        .then(result1 => {
            getTranscript(contactId, transcript_seg_to_customer_table_name)
            .then(result2 => {
                var contactTranscriptFromCustomer = result1;
                var contactTranscriptToCustomer = result2;

                //set up the database query to be used to update the customer information record in DynamoDB
                var paramsUpdate = {
                    //DynamoDB Table Name.  Replace with your table name
                    TableName: contact_table_name,
                    Key: {
                        "contactId": contactId
                    },

                    ExpressionAttributeValues: {
                        ":var1": contactTranscriptFromCustomer,
                        ":var2": contactTranscriptToCustomer,
                        ":var3": recordingURL
                    },

                    UpdateExpression: "SET contactTranscriptFromCustomer = :var1, contactTranscriptToCustomer = :var2, recordingURL = :var3"
                };

                //update the customer record in the database with the new call information using the paramsUpdate query we setup above:
                var docClient = new aws.DynamoDB.DocumentClient();
                docClient.update(paramsUpdate, function (err, data) {
                    if (err) {
                        sendAnonymousData("ERROR");
                        console.log("Unable to update item. Error: ", JSON.stringify(err, null, 2));
                    } else {
                        sendAnonymousData("SUCCESS");
                        console.log("Updated item succeeded: ", JSON.stringify(data, null, 2));
                    }

                });


                callback(null, "Success!");
            })
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

// This function sends anonymous usage data, if enabled
function sendAnonymousData(status) {
    var event = {};
    event["Data"] = {};
    event["Data"]["ProcessContactResult"] = status;
    event["UUID"] = uuid;
    event["Solution"] = "SO0064";
    var time = new Date();
    event["TimeStamp"] = time.toString();
    if (metrics == 'Yes') {
        let _metricsHelper = new metricsHelper();
        _metricsHelper.sendAnonymousMetric(event,function(err, data) {
            if (err) {
                console.log('Error sending anonymous metric:');
                console.log(err);
            }
            else {
                console.log('Success sending anonymous metric:');
                console.log(data);
            }
        });
    }
    else {
        console.log('Customer has elected not to send anonymous metrics');
    }
}
