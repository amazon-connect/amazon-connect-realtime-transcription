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
const metricsHelper = require('./metricsHelper.js');
const metrics = process.env.METRICS;
const nodeUuid = require('uuid');
const uuid = nodeUuid.v4();

function createContactFlow(properties, callback) {
    if (!properties.bucketName)
        callback("Bucket name not specified");

    var aws = require("aws-sdk");
    var S3 = new aws.S3();

    console.log('Event Details', properties);
    var lambdaInitArn = properties.contactInitFunction;
    var lambdaTriggerArn = properties.kvsTriggerFunction;
    var bucketName = properties.bucketName;

    var mainFlow = `{"modules":[{"id":"04aacf02-1a6a-4df8-9a3b-5cce1d6e25a4","type":"Disconnect","branches":[],"parameters":[],"metadata":{"position":{"x":1282,"y":140}}},{"id":"aa21389d-0252-465c-80ec-2c9ea9a83b19","type":"PlayPrompt","branches":[{"condition":"Success","transition":"99458f47-6941-48ce-9b90-fdf184759b22"}],"parameters":[{"name":"Text","value":"An error occurred with the KVS trigger lambda function.","namespace":null},{"name":"TextToSpeechType","value":"text"}],"metadata":{"position":{"x":1009,"y":895},"useDynamic":false}},{"id":"856dd865-e5a0-49c6-aacc-55fe53c38a22","type":"SetLoggingBehavior","branches":[{"condition":"Success","transition":"07273109-a75a-4742-aaae-ce35603c31fc"}],"parameters":[{"name":"LoggingBehavior","value":"Enable"}],"metadata":{"position":{"x":186,"y":16}}},{"id":"abe8c2b7-f002-41b1-8e9e-374ff32c2351","type":"InvokeExternalResource","branches":[{"condition":"Success","transition":"e7825b58-a9db-4935-9f83-e67a564176e8"},{"condition":"Error","transition":"e7825b58-a9db-4935-9f83-e67a564176e8"}],"parameters":[{"name":"FunctionArn","value":"${lambdaInitArn}","namespace":null},{"name":"TimeLimit","value":"8"}],"metadata":{"position":{"x":78,"y":437},"dynamicMetadata":{},"useDynamic":false},"target":"Lambda"},{"id":"e7825b58-a9db-4935-9f83-e67a564176e8","type":"SetAttributes","branches":[{"condition":"Success","transition":"de044ae9-5056-4c9a-a96e-b4d5b6ac27fb"},{"condition":"Error","transition":"de044ae9-5056-4c9a-a96e-b4d5b6ac27fb"}],"parameters":[{"name":"Attribute","value":"true","key":"transcribeCall","namespace":null},{"name":"Attribute","value":"false","key":"saveCallRecording","namespace":null},{"name":"Attribute","value":"aid","key":"aid","namespace":"External"},{"name":"Attribute","value":"sak","key":"sak","namespace":"External"},{"name":"Attribute","value":"sst","key":"sst","namespace":"External"}],"metadata":{"position":{"x":86,"y":673}}},{"id":"99458f47-6941-48ce-9b90-fdf184759b22","type":"Disconnect","branches":[],"parameters":[],"metadata":{"position":{"x":987,"y":1107}}},{"id":"410057d0-9390-486b-bbb4-c4def2a7367c","type":"PlayPrompt","branches":[{"condition":"Success","transition":"99458f47-6941-48ce-9b90-fdf184759b22"}],"parameters":[{"name":"Text","value":"An error occurred when we tried to start streaming.","namespace":null},{"name":"TextToSpeechType","value":"text"}],"metadata":{"position":{"x":87,"y":895},"useDynamic":false}},{"id":"919982d6-3066-49e5-afe5-619896781245","type":"Transfer","branches":[{"condition":"AtCapacity","transition":"04aacf02-1a6a-4df8-9a3b-5cce1d6e25a4"},{"condition":"Error","transition":"04aacf02-1a6a-4df8-9a3b-5cce1d6e25a4"}],"parameters":[],"metadata":{"position":{"x":1036,"y":142},"useDynamic":false,"queue":null},"target":"Queue"},{"id":"3434e4a0-e2c1-4c3a-9f52-81ae81a852e2","type":"SetQueue","branches":[{"condition":"Success","transition":"919982d6-3066-49e5-afe5-619896781245"},{"condition":"Error","transition":"919982d6-3066-49e5-afe5-619896781245"}],"parameters":[{"name":"Queue","value":"","namespace":null,"resourceName":"BasicQueue"}],"metadata":{"position":{"x":802,"y":143},"useDynamic":false,"queue":{"id":"","text":"BasicQueue"}}},{"id":"24e5d5ff-402d-416d-8d04-38020e7f0428","type":"SetAttributes","branches":[{"condition":"Success","transition":"97a964a7-5dd2-4c82-b21f-173b209be8a7"},{"condition":"Error","transition":"97a964a7-5dd2-4c82-b21f-173b209be8a7"}],"parameters":[{"name":"Attribute","value":"es-US","key":"languageCode","namespace":null}],"metadata":{"position":{"x":604,"y":618}}},{"id":"97a964a7-5dd2-4c82-b21f-173b209be8a7","type":"InvokeExternalResource","branches":[{"condition":"Success","transition":"3434e4a0-e2c1-4c3a-9f52-81ae81a852e2"},{"condition":"Error","transition":"aa21389d-0252-465c-80ec-2c9ea9a83b19"}],"parameters":[{"name":"FunctionArn","value":"${lambdaTriggerArn}","namespace":null},{"name":"TimeLimit","value":"8"}],"metadata":{"position":{"x":883,"y":532},"dynamicMetadata":{},"useDynamic":false},"target":"Lambda"},{"id":"de044ae9-5056-4c9a-a96e-b4d5b6ac27fb","type":"GetUserInput","branches":[{"condition":"Evaluate","conditionType":"Equals","conditionValue":"1","transition":"8f76ffad-b7c2-4b71-8eb5-7d1e17c53a33"},{"condition":"Evaluate","conditionType":"Equals","conditionValue":"2","transition":"24e5d5ff-402d-416d-8d04-38020e7f0428"},{"condition":"Timeout","transition":"8f76ffad-b7c2-4b71-8eb5-7d1e17c53a33"},{"condition":"NoMatch","transition":"8f76ffad-b7c2-4b71-8eb5-7d1e17c53a33"},{"condition":"Error","transition":"8f76ffad-b7c2-4b71-8eb5-7d1e17c53a33"}],"parameters":[{"name":"Text","value":"Press 1 for English,  2 for Spanish","namespace":null},{"name":"TextToSpeechType","value":"text"},{"name":"Timeout","value":"5"},{"name":"MaxDigits","value":"1"}],"metadata":{"position":{"x":344,"y":473},"conditionMetadata":[{"id":"0c5d7474-f558-4db5-89a3-e2f3df470f31","value":"1"},{"id":"e7a73f28-aa59-417a-a605-764ded6f6a47","value":"2"}],"useDynamic":false},"target":"Digits"},{"id":"8f76ffad-b7c2-4b71-8eb5-7d1e17c53a33","type":"SetAttributes","branches":[{"condition":"Success","transition":"97a964a7-5dd2-4c82-b21f-173b209be8a7"},{"condition":"Error","transition":"97a964a7-5dd2-4c82-b21f-173b209be8a7"}],"parameters":[{"name":"Attribute","value":"en-US","key":"languageCode","namespace":null}],"metadata":{"position":{"x":595,"y":382}}},{"id":"6728609a-9707-41f7-a87c-30ac1fde4f4c","type":"StartMediaStreaming","branches":[{"condition":"Success","transition":"abe8c2b7-f002-41b1-8e9e-374ff32c2351"},{"condition":"Error","transition":"410057d0-9390-486b-bbb4-c4def2a7367c"}],"parameters":[{"name":"Track","value":"FromCustomer"},{"name":"Track","value":"ToCustomer"},{"name":"MediaStreamTypes","value":"Audio"}],"metadata":{"position":{"x":85,"y":210},"fromCustomer":true,"toCustomer":true}},{"id":"07273109-a75a-4742-aaae-ce35603c31fc","type":"PlayPrompt","branches":[{"condition":"Success","transition":"53e6aa2b-e374-4ae6-bfc9-1285d2ac202f"}],"parameters":[{"name":"Text","value":"This is the sample flow to demonstrate customer audio streaming.","namespace":null},{"name":"TextToSpeechType","value":"text"}],"metadata":{"position":{"x":405,"y":17},"useDynamic":false}},{"id":"53e6aa2b-e374-4ae6-bfc9-1285d2ac202f","type":"SetRecordingBehavior","branches":[{"condition":"Success","transition":"6728609a-9707-41f7-a87c-30ac1fde4f4c"}],"parameters":[{"name":"RecordingBehaviorOption","value":"Enable"},{"name":"RecordingParticipantOption","value":"Both"}],"metadata":{"position":{"x":645,"y":10}}}],"version":"1","type":"contactFlow","start":"856dd865-e5a0-49c6-aacc-55fe53c38a22","metadata":{"entryPointPosition":{"x":20,"y":20},"snapToGrid":false,"name":"kvsStreamingFlow","description":null,"type":"contactFlow","status":"published","hash":"74fbc11cc226c019c8792e9132df3d30e1f95885a7b5380fc071aa1c2a7589dc"}}`;
    uploadFlowToS3('kvsStreamingSampleFlow', mainFlow, bucketName, S3, callback);
}

createContactFlow.handler = function(event, context) {
    console.log(JSON.stringify(event, null, '  '));

    if (event.RequestType == 'Delete') {
        return sendResponse(event, context, "SUCCESS");
    }

    createContactFlow(event.ResourceProperties, function(err, result) {
        var status = err ? 'FAILED' : 'SUCCESS';
        sendAnonymousData(status);
        return sendResponse(event, context, status, result, err);
    });
};

function getReason(err) {
    if (err)
        return err.message;
    else
        return '';
}

function uploadFlowToS3(name, body, bucketName, S3, callback) {
    S3.putObject({
        Bucket: bucketName,
        Key: name,
        Body:body
    }, function(err, data) {

        if (err)
            return callback(err);

        return callback(null, "SUCCESS");
    });
}


function sendResponse(event, context, status, data, err) {
    var responseBody = {
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        PhysicalResourceId: context.logStreamName,
        Status: status,
        Reason: getReason(err) + " See details in CloudWatch Log: " + context.logStreamName,

    };

    console.log("RESPONSE:\n", responseBody);
    var json = JSON.stringify(responseBody);

    var https = require("https");
    var url = require("url");

    var parsedUrl = url.parse(event.ResponseURL);
    var options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: "PUT",
        headers: {
            "content-type": "",
            "content-length": json.length
        }
    };

    var request = https.request(options, function(response) {
        console.log("STATUS: " + response.statusCode);
        console.log("HEADERS: " + JSON.stringify(response.headers));
        context.done(null, data);
    });

    request.on("error", function(error) {
        console.log("sendResponse Error:\n", error);
        context.done(error);
    });

    request.on("end", function() {
        console.log("end");
    });
    request.write(json);
    request.end();
}

module.exports = createContactFlow;

if(require.main === module) {
    console.log("called directly");
    if (process.argv.length < 3)
        usageExit();
    try {
        var data = JSON.parse(process.argv[2]);
    } catch (error) {
        console.error('Invalid JSON', error);
        usageExit();
    }
    createContactFlow(data, function(err, res) {
        console.log("Result", err, res);
    });
}

function usageExit() {
    var path = require('path');
    console.error('Usage: '  + path.basename(process.argv[1]) + ' json-array');
    process.exit(1);
}

// This function sends anonymous usage data, if enabled
function sendAnonymousData(status) {
    var event = {};
    event["Data"] = {};
    event["Data"]["CreateContactFlowResult"] = status;
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
