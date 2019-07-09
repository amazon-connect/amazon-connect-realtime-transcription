package com.amazonaws.transcribestreaming;

import com.amazonaws.kvstranscribestreaming.TranscribedSegmentWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.services.transcribestreaming.model.StartStreamTranscriptionResponse;
import software.amazon.awssdk.services.transcribestreaming.model.TranscriptEvent;
import software.amazon.awssdk.services.transcribestreaming.model.TranscriptResultStream;

/**
 * Implementation of StreamTranscriptionBehavior to define how a stream response is handled.
 *
 * <p>Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.</p>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 * <p>
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
public class StreamTranscriptionBehaviorImpl implements StreamTranscriptionBehavior {

    private static final Logger logger = LoggerFactory.getLogger(StreamTranscriptionBehaviorImpl.class);
    private final TranscribedSegmentWriter segmentWriter;
    private final String tableName;

    public StreamTranscriptionBehaviorImpl(TranscribedSegmentWriter segmentWriter, String tableName) {
        this.segmentWriter = segmentWriter;
        this.tableName = tableName;
    }

    @Override
    public void onError(Throwable e) {
        logger.error("Error in middle of stream: ", e);
    }

    @Override
    public void onStream(TranscriptResultStream e) {
        // EventResultStream has other fields related to the timestamp of the transcripts in it.
        // Please refer to the javadoc of TranscriptResultStream for more details
        segmentWriter.writeToDynamoDB((TranscriptEvent) e, tableName);
    }

    @Override
    public void onResponse(StartStreamTranscriptionResponse r) {
        logger.info(String.format("%d Received Initial response from Transcribe. Request Id: %s",
                System.currentTimeMillis(), r.requestId()));
    }

    @Override
    public void onComplete() {
        logger.info("Transcribe stream completed");
    }
}

