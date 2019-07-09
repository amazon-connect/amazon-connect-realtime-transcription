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
const AWS = require('aws-sdk');
const lambda = new AWS.Lambda();
const metricsHelper = require('./metricsHelper.js');
const metrics = process.env.METRICS;
const nodeUuid = require('uuid');
const uuid = nodeUuid.v4();

exports.handler = (event, context, callback) => {

    console.log("Received event from Amazon Connect " + JSON.stringify(event));

    let payload = "";

    if (event.eventType) {
        payload ={
            inputFileName: "keepWarm.wav",
            connectContactId: "12b87d2b-keepWarm",
            transcriptionEnabled: "false"
        };
    } else {
        payload = {
            streamARN: event.Details.ContactData.MediaStreams.Customer.Audio.StreamARN,
            startFragmentNum: event.Details.ContactData.MediaStreams.Customer.Audio.StartFragmentNumber,
            connectContactId: event.Details.ContactData.ContactId,
            transcriptionEnabled: event.Details.ContactData.Attributes.transcribeCall === "true" ? true : false,
            saveCallRecording: event.Details.ContactData.Attributes.saveCallRecording === "false" ? false : true,
            languageCode: event.Details.ContactData.Attributes.languageCode === "es-US" ? "es-US" : "en-US",
            // These default to true for backwards compatability purposes
            streamAudioFromCustomer: event.Details.ContactData.Attributes.streamAudioFromCustomer === "false" ? false : true,
            streamAudioToCustomer: event.Details.ContactData.Attributes.streamAudioToCustomer === "false" ? false : true
        };
    }

    console.log("Trigger event passed to transcriberFunction" + JSON.stringify(payload));

    const params = {
        // not passing in a ClientContext
        'FunctionName': process.env.transcriptionFunction,
        // InvocationType is RequestResponse by default
        // LogType is not set so we won't get the last 4K of logs from the invoked function
        // Qualifier is not set so we use $LATEST
        'InvokeArgs': JSON.stringify(payload)
    };

    lambda.invokeAsync(params, function(err, data) {
        if (err) {
            sendAnonymousData("ERROR");
            throw (err);
        } else {
            console.log(JSON.stringify(data));
            sendAnonymousData("SUCCESS");
            if (callback)
                callback(null, buildResponse());
            else
                console.log('nothing to callback so letting it go');
        }
    });

    callback(null, buildResponse());
};

function buildResponse() {
    return {
        // we always return "Success" for now
        lambdaResult:"Success"
    };
}

// This function sends anonymous usage data, if enabled
function sendAnonymousData(response) {
    var event = {};
    event["Data"] = {};
    event["Data"]["KvsTriggerLambdaResult"] = response;
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
