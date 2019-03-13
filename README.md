# Amazon Connect Real-time Transcription Lambda

Making it easy to get started with Amazon Connect live audio streaming and real-time transcription using Amazon Transcribe.

## On this Page
- [Project Overview](#project-overview)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Lambda Environment Variables](#lambda-environment-variables)
- [Sample Trigger Lambda](#Sample-trigger-Lambda-function)

## Project Overview
The purpose of this project is to provide a code example and a fully functional Lambda function to get you started with capturing and transcribing Amazon Connect phone calls using Kinesis Video Streams and Amazon Transcribe. This Lambda function can be used to create varying solutions such as capturing audio in the IVR, providing real-time transcription to agents, or even creating a voicemail solution for Amazon Connect. To enable these different use-cases, there are multiple environment variables controlling the behavior of the Lambda Function: [“environment variables”](#lambda-environment-variables). 

## Architecture Overview
![](images/arch.png)

### Description
This solution can be configured to use the following services: [Amazon Connect](https://aws.amazon.com/connect/), [Amazon Kinesis Video Streams](https://aws.amazon.com/kinesis/video-streams), [Amazon Transcribe](https://aws.amazon.com/transcribe), [Amazon DynamoDB](https://aws.amazon.com/dynamodb), [AWS Lambda](https://aws.amazon.com/lambda), and [Amazon S3](https://aws.amazon.com/s3).

With [Amazon Connect](https://aws.amazon.com/connect/), customer audio can be live streamed to Kinesis Video Streams as described in this [Amazon Connect documentation](https://docs.aws.amazon.com/connect/latest/userguide/customer-voice-streams.html)  This project serves as an example of how to consume an Amazon Connect live audio stream, capture the audio and send it to S3, as well as perform real-time transcription using [Amazon Transcribe](https://aws.amazon.com/transcribe) and posting those transcriptions to a DynamoDB table. 

In the diagram above, once a call is connected to Amazon Connect:
- (Step 1) In the Amazon Connect Contact Flow, ensure there is a "Start Media Streaming" block
    - (Step 1a) Once the "Start Media Streaming" block is executed, a KVS stream will be "assigned" and Amazon Connect will begin to stream the customer audio
    - Amazon Connect will continue to stream the customer audio for the duration of this call until a "Stop media streaming" block is executed, or the call is disconnected
- (Step 2) In the Amazon Connect Contact Flow invoke the [Trigger Lambda Function](#Sample-trigger-Lambda-function) which will automatically be passed the KVS details and the ContactId
    - tip: Set a Contact Attribute prior to invoking the trigger lambda with a key of: `transcribeCall` and a value of either `true` or `false`
    - The [Sample Trigger Lambda Function](#Sample-trigger-Lambda-function) is set up to look for this attribute and include it in the invocation event that will be sent in (Step 3)
- (Step 3) The "trigger" Lambda Function will take the details from Amazon Connect, and invoke the Java Lambda (from this project) passing it all the details needed for it to start consuming the Kinesis Video Stream (call audio). Once the trigger lambda returns `success` back to the Amazon Connect Contact Flow, the flow will continue to execute while the KVS Consumer/transcriber Lambda function continues to process the audio
- (Step 4) The KVS Consumer/transcriber function will continue to process audio for up to 15 minutes (Lambda limit) or until the call is disconnected

The Lambda code expects the Kinesis Video Stream details provided by the Amazon Connect Contact Flow as well as the Amazon Connect Contact Id. The handler function of the Lambda is present in `KVSTranscribeStreamingLambda.java` and it uses the GetMedia API of Kinesis Video Stream to fetch the InputStream of the customer audio call. The InputStream is processed using the AWS Kinesis Video Streams provided Parser Library. If the `transcriptionEnabled` property is set to true on the input, a TranscribeStreamingRetryClient client is used to send audio bytes of the audio call to Transcribe. As the transcript segments are being returned, they are saved in a DynamoDB table having ContactId as the Partition key and StartTime of the segment as the Sort key. The audio bytes are also saved in a file along with this and at the end of the audio call, the WAV audio file is uploaded to S3 in the provided `RECORDINGS_BUCKET_NAME` bucket.

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
        - Possible values are either `TRUE` or `FALSE`
        - default behavior if this is not passed is FALSE (no transcription will occur)
        - This value can be set dynamically in the Amazon Connect Contact Flow as a contact attribute that the trigger lambda function will use and pass to this Java lambda function
- Create (or use an existing) S3 bucket for the audio files to be uploaded
- If you would like to use the real-time transcription feature:
    - Create a DynamoDB table, with the "Partition Key" of `ContactId`, and "Sort Key" of `StartTime`
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

## Sample Lambda Invocation Event

```
   {
    "streamARN": "stream arn",
    "startFragmentNum": "start fragment number",
    "connectContactId": "Contact ID",
    "transcriptionEnabled": "TRUE or FALSE"
    }
```

## Sample "trigger Lambda" function
This is a minimal example of a "trigger" lambda function you can create to be invoked from Amazon Connect. This trigger function will take the details from Amazon Connect, and pass them to the KVS/Transcription Lambda Function from this project:

```
'use strict';
const AWS = require('aws-sdk'); const lambda = new AWS.Lambda();
exports.handler = (event, context, callback) => {

    console.log("Received event from Amazon Connect");
    console.log(JSON.stringify(event));
    
    let payload = {
		        streamARN: event.Details.ContactData.MediaStreams.Customer.Audio.StreamARN,
		        startFragmentNum: event.Details.ContactData.MediaStreams.Customer.Audio.StartFragmentNumber,
		        connectContactId: event.Details.ContactData.ContactId,
		        transcriptionEnabled: event.Details.ContactData.Attributes.transcribeCall === "true" ? true : false
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

	lambda.invokeAsync(params, function(err, data) {

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
        lambdaResult:"Success"
    };
}


```



## License Summary
This sample code is made available under a modified MIT license. See the LICENSE file.

