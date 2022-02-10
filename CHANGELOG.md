## [2.0.0] - 2022-02-10
### Changed
- cloudformation.template only creates one DynamoDB table, contactDetails, instead of three  
- contactDetails table has new schema, "pk" (S) for partition key, and "sk" (S) for sort key 
  - contactDetails (1.x.x) with key schema <code>{partition: "contactId", "S"}</code> becomes contactDetails (2.x.x) with key schema <code>{partition: "pk", "S", sort: "sk", "S"}</code>
    - pk format is "CONNECT_TRANSCRIPTION#!#*contactId*" 
    - sk is "TRANSCRIPTION_SUMMARY" 
  - transcriptSegmentsTable table is consolidated into contactDetails 
    - pk format is "CONNECT_TRANSCRIPTION#!#*contactId*" 
    - sk format is "FROM_CUSTOMER#!#*startTime*" 
  - transcriptSegmentsToCustomerTable table is consolidated into contactDetails 
    - pk format is "CONNECT_TRANSCRIPTION#!#*contactId*" 
    - sk format is "TO_CUSTOMER#!#*startTime*" 
- kvs_trigger.js
  - update primary key format to match new schema
  - add lambda invocation event for to TRANSCRIPTION_SUMMARY document
- overlay_audio.py
  - update primary key format to match new schema
- process_contact.js
  - remove transcript_seg* environment variables
  - update primary key format to match new schema
  - query contactDetails based on sk prefix
- KVSTranscribeStreamingLambda.java
  - remove TABLE_CALLER_TRANSCRIPT_TO_CUSTOMER environment variable
  - update primary key format to match new schema
  - pass prefix to TranscribedSegmentWriter
- TranscribedSegmentWriter.java
  - update primary key format to match new schema
  - use prefix to determine sk
- Lambda zip files updated in deployment/* folder to reflect code changes
- Architecture diagram images/ivr-recording-architecture.png updated to reflect changes
- replace deprecated *compile* syntax to newer *implementation* syntax in build.gradle to allow Java compilations for gradle version 7+ 
- update node version to 14.x 
- README updated to reflect changes 

## [1.0.1] - 2022-01-27
### Added
- Lambda zip files restored in deployment/* folder 

### Changed
- amazon-kinesis-video-streams-parser-library version to 1.2.1 

### Removed
- .DS_Store 

## [1.0.0] - 2021-12-17
### Added
- CHANGELOG.md

### Changed
- amazon-kinesis-video-streams-parser-library version to 1.1.0
- org.slf4j:slf4j-api to 1.7.32
- org.slf4j:slf4j-log4j12 to 1.7.32

### Removed
- deployment files