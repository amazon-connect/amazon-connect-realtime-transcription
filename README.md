# Amazon Connect Real-time Transcription Lambda

Making it easy to get started with Amazon Connect live audio streaming and real-time transcription using Amazon Transcribe.

## On this Page
- [Project Overview](#project-overview)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Lambda Environment Variables](#lambda-environment-variables)
- [Lambda Invocation Event Details](#lambda-invocation-event-details)
- [Sample Trigger Lambda](#Sample-trigger-Lambda-function)

## Project Overview
The purpose of this project is to provide a code example and a fully functional Lambda function to get you started with capturing and transcribing Amazon Connect phone calls using Kinesis Video Streams and Amazon Transcribe. This Lambda function can be used to create varying solutions such as capturing audio in the IVR, providing real-time transcription to agents, or even creating a voicemail solution for Amazon Connect. To enable these different use-cases there are multiple [environment variables](#lambda-environment-variables) and parameters in the [invocation event](#lambda-invocation-event-details) that control the behavior of the Lambda Function.

## Architecture Overview
![](images/arch.png)

### Description
This solution can be configured to use the following services: [Amazon Connect](https://aws.amazon.com/connect/), [Amazon Kinesis Video Streams](https://aws.amazon.com/kinesis/video-streams), [Amazon Transcribe](https://aws.amazon.com/transcribe), [Amazon DynamoDB](https://aws.amazon.com/dynamodb), [AWS Lambda](https://aws.amazon.com/lambda), and [Amazon S3](https://aws.amazon.com/s3).

With [Amazon Connect](https://aws.amazon.com/connect/), customer audio can be live streamed to Kinesis Video Streams as described in this [Amazon Connect documentation](https://docs.aws.amazon.com/connect/latest/userguide/customer-voice-streams.html). This project serves as an example of how to consume an Amazon Connect live audio stream, capture the audio and send it to S3, as well as perform real-time transcription using [Amazon Transcribe](https://aws.amazon.com/transcribe) and posting those transcriptions to a DynamoDB table. 

In the diagram above, once a call is connected to Amazon Connect:
- (Step 1) In the Amazon Connect Contact Flow, ensure there is a "Start Media Streaming" block
    - (Step 1a) Once the "Start Media Streaming" block is executed, a KVS stream will be "assigned" and Amazon Connect will begin to stream the customer audio
    - Amazon Connect will continue to stream the customer audio for the duration of this call until a "Stop media streaming" block is executed, or the call is disconnected
- (Step 2) In the Amazon Connect Contact Flow invoke the [Trigger Lambda Function](#Sample-trigger-Lambda-function) which will automatically be passed the KVS details and the ContactId
    - tip: Set a Contact Attribute prior to invoking the trigger lambda with a key of: `transcribeCall` and a value of either `true` or `false`
    - tip: Set a Contact Attribute prior to invoking the trigger lambda with a key of: `saveCallRecording` and a value of either `true` or `false`
    - tip: Set a Contact Attribute prior to invoking the trigger lambda with a key of: `languageCode` and a value of either `en-US` or `es-US`
    - The [Sample Trigger Lambda Function](#Sample-trigger-Lambda-function) is set up to look for this attribute and include it in the invocation event that will be sent in (Step 3)
- (Step 3) The "trigger" Lambda Function will take the details from Amazon Connect, and invoke the Java Lambda (from this project) passing it all the details needed for it to start consuming the Kinesis Video Stream (call audio). Once the trigger lambda returns `success` back to the Amazon Connect Contact Flow, the flow will continue to execute while the KVS Consumer/transcriber Lambda function continues to process the audio
- (Step 4) The KVS Consumer/transcriber function will continue to process audio for up to 15 minutes (Lambda limit) or until the call is disconnected

The Lambda code expects the Kinesis Video Stream details provided by the Amazon Connect Contact Flow as well as the Amazon Connect Contact Id. The handler function of the Lambda is present in `KVSTranscribeStreamingLambda.java` and it uses the GetMedia API of Kinesis Video Stream to fetch the InputStream of the customer audio call. The InputStream is processed using the AWS Kinesis Video Streams provided Parser Library. If the `transcriptionEnabled` property is set to true on the input, a TranscribeStreamingRetryClient client is used to send audio bytes of the audio call to Transcribe. As the transcript segments are being returned, they are saved in a DynamoDB table having ContactId as the Partition key and StartTime of the segment as the Sort key. The audio bytes are also saved in a file along with this and at the end of the audio call, if the `saveCallRecording` property is set to true on the input, the WAV audio file is uploaded to S3 in the provided `RECORDINGS_BUCKET_NAME` bucket.

As of this writing Amazon Transcribe supports real time transcription of US-English, and US-Spanish. See the Amazon Transcribe [streaming documentation](https://docs.aws.amazon.com/transcribe/latest/dg/streaming.html) for the latest supported languages.

## Getting Started
Getting started with this project is easy. The most basic use case of capturing audio in the Amazon Connect IVR can be accomplished by downloading the pre-packaged Lambda Function, deploying it in your account, giving it the correct permissions to access S3 and KVS, and then invoking it and passing the details in the invocation event.

### Easy Setup
The simplest way to get started is to:
- Ensure that your Amazon Connect instance has the "live media streaming" feature enabled by following the [Amazon Connect documentation](https://docs.aws.amazon.com/connect/latest/userguide/customer-voice-streams.html) for "Enable Live Media Streaming"
- Create a "trigger" lambda function that can be invoked from the Amazon Connect Contact Flow that will pass the following details to this Java lambda function:
    - streamARN (will be provided after the successful execution of the "Start Media Streaming" block in Amazon Connect)    
    - startFragmentNum (will be provided after the successful execution of the "Start Media Streaming" block in Amazon Connect) 
    - connectContactId (The contact ID for this call)
    - transcriptionEnabled
        - Possible values are either `true` or `false`
        - default behavior if this is not passed is false (no transcription will occur)
        - This value can be set dynamically in the Amazon Connect Contact Flow as a contact attribute that the trigger lambda function will use and pass to this Java lambda function
    - saveCallRecording
        - Possible values are either `true` or `false`
        - default behavior if this is not passed is false (audio file will not be uploaded to S3)
        - This value can be set dynamically in the Amazon Connect Contact Flow as a contact attribute that the trigger lambda function will use and pass to this Java lambda function
    - languageCode
        - Possible values are either `en-US` or `es-US` - See the Amazon Transcribe [streaming documentation](https://docs.aws.amazon.com/transcribe/latest/dg/streaming.html) for the latest supported languages.
        - default behavior if this is not passed is `en-US` (US English)
        - This value can be set dynamically in the Amazon Connect Contact Flow as a contact attribute that the trigger lambda function will use and pass to this Java lambda function
- Create (or use an existing) S3 bucket for the audio files to be uploaded
- If you would like to use the real-time transcription feature:
    - Create a DynamoDB table, with the "Partition Key" named as `ContactId` having String data type , and "Sort Key" named `StartTime` having Number data type
- [Download](https://github.com/aws-samples/amazon-connect-realtime-transcription/raw/master/dist/amazon-connect-realtime-transcription.zip) and deploy the pre-packaged Lambda function
    - Ensure that the lambda execution role assigned has access to the services you plan to enable
    - Set the timeout on the lambda function to the correct limit to handle the length of calls you plan on processing with this function (up to 15 min)
    - The handler for the lambda function is: `com.amazonaws.kvstranscribestreaming.KVSTranscribeStreamingLambda::handleRequest`
- Populate the [environment variables](#lambda-environment-variables) with the correct details for your solution


### Building the project
The lambda code is designed to be built with Gradle. All requisite dependencies are captured in the `build.gradle` file. The code also depends on the [AWS Kinesis Video Streams Parser Library](https://github.com/aws/amazon-kinesis-video-streams-parser-library) which has been built into a jar can be found in the jars folder. Simply use `gradle build` to build the zip that can be deployed as an AWS Lambda application.

## Lambda Environment Variables
This Lambda Function has environment variables that control its behavior:
* `APP_REGION` - The region for AWS DynamoDB, S3 and Kinesis Video Streams resources (ie: us-east-1)
* `TRANSCRIBE_REGION` - The region to be used for AWS Transcribe Streaming (ie: us-east-1)
* `RECORDINGS_BUCKET_NAME` - The AWS S3 bucket name where the audio files will be saved (Lambda needs to have permissions to this bucket)
* `RECORDINGS_KEY_PREFIX` - The prefix to be used for the audio file names in AWS S3
* `RECORDINGS_PUBLIC_READ_ACL` - Set to TRUE to add public read ACL on audio file stored in S3. This will allow for anyone with S3 URL to download the audio file.
* `INPUT_KEY_PREFIX` - The prefix for the AWS S3 file name provided in the Lambda request. This file is expected to be present in `RECORDINGS_BUCKET_NAME`
* `CONSOLE_LOG_TRANSCRIPT_FLAG` - Needs to be set to TRUE if the Connect call transcriptions are to be logged.
* `TABLE_CALLER_TRANSCRIPT` - The DynamoDB table name where the transcripts need to be saved (Table Partition key must be: `ContactId`, and Sort Key must be: `StartTime`)
* `SAVE_PARTIAL_TRANSCRIPTS` - Set to TRUE if partial segments need to saved in the DynamoDB table. Else, only complete segments will be persisted.

### Sample Lambda Environment Variables
![](images/env-variables-example.png)

## Lambda Invocation Event Details
This Lambda Function will need some details when invoked:
* `streamARN` - The ARN of the Kinesis Video stream that includes the customer audio, this is provided by Amazon Connect when streaming is started successfully
* `startFragmentNum` - Identifies the Kinesis Video Streams fragment in which the customer audio stream started, this is provided by Amazon Connect when streaming is started successfully
* `connectContactId` - The Amazon Connect Contact ID, this is always present in the Amazon Connect invocation event.
* `transcriptionEnabled` - An optional flag to instruct the Lambda function if transcription (using Amazon Transcribe) is to be enabled or not (options are "true" or "false")
* `saveCallRecording` - An optional flag to instruct the Lambda function to upload the saved audio to S3 (options are "true" or "false")
* `languageCode` - An optional flag to instruct the Lambda function on what language the source customer audio is in, as of this writing the options are: "en-US" or "es-US" (US-English, or US-Spanish)

### Sample Lambda Invocation Event
The following is a sample invocation event:

```
   { 
       "streamARN": "arn:aws:kinesisvideo:us-east-1:6137874xxxxx:stream/kvsstreams-connect-demo-6855eee9-fa47-4b84-a970-ac6dbdd30b9d/1542430xxxxxx",
       "startFragmentNum": "9134385233318150666908441974200077706515712xxxx",
       "connectContactId": "b0e14540-ca63-4205-b285-c6dde79bxxxx",
       "transcriptionEnabled": true,
       "saveCallRecording": true,
       "languageCode": "en-US" 
    }
```

## Sample "trigger Lambda" function
This is a minimal example of a "trigger" lambda function you can create to be invoked from Amazon Connect. This trigger function will take the details from Amazon Connect, and pass them to the KVS/Transcription Lambda Function from this project:

```
'use strict';
const AWS = require('aws-sdk');
const lambda = new AWS.Lambda();
exports.handler = (event, context, callback) => {

    console.log("Received event from Amazon Connect");
    console.log(JSON.stringify(event));

    //assuming you have set an attribute in the Amazon Connect contact flow for "transcribeCall" and "saveCallRecording"
    //we will use those attributes to drive the transcription Lambda behavior

    let payload = {
        //StreamARN will be included in the Amazon Connect invocation payload if streaming was started successfully 
        streamARN: event.Details.ContactData.MediaStreams.Customer.Audio.StreamARN,

        //StartFragmentNumber will be included in the Amazon Connect invocation payload if streaming was started successfully 
        startFragmentNum: event.Details.ContactData.MediaStreams.Customer.Audio.StartFragmentNumber,

        //ContactId is always included in the Amazon Connect invocation payload
        connectContactId: event.Details.ContactData.ContactId,

        //The following assumes you have set associated attributes in the Amazon Connect Contact Flow to control these options
        //transcribeCall either "true" or "false", if not set the default is "false"
        transcriptionEnabled: event.Details.ContactData.Attributes.transcribeCall === "true" ? true : false,

        //saveCallRecording either "true" or "false", if not set the default is "true"
        saveCallRecording: event.Details.ContactData.Attributes.saveCallRecording === "false" ? false : true,

        //languageCode either "en-US" or "es-US" for US-English, or US-Spanish, if not set the default is "en-US"
        languageCode: event.Details.ContactData.Attributes.languageCode === "es-US" ? "es-US" : "en-US"
    };

    console.log("Trigger event passed to transcriberFunction" + JSON.stringify(payload));

    const params = {
        // not passing in a ClientContext
        //Use an environment variable called transcriptionFunction with the value of the transcription-KVS lambda function name
        'FunctionName': process.env.transcriptionFunction,
        // InvocationType is RequestResponse by default
        // LogType is not set so we won't get the last 4K of logs from the invoked function
        // Qualifier is not set so we use $LATEST
        'InvokeArgs': JSON.stringify(payload)
    };

    lambda.invokeAsync(params, function (err, data) {

        if (err)
            throw (err);
        else {
            console.log(JSON.stringify(data));
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
        lambdaResult: "Success"
    };
}


```



## License Summary
This sample code is made available under a modified MIT license. See the LICENSE file.

