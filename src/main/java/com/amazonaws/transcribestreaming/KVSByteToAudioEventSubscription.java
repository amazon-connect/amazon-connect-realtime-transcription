package com.amazonaws.transcribestreaming;

import com.amazonaws.kinesisvideo.parser.mkv.StreamingMkvReader;
import com.amazonaws.kinesisvideo.parser.utilities.FragmentMetadataVisitor;
import com.amazonaws.kvstranscribestreaming.KVSUtils;
import org.apache.commons.lang3.Validate;
import org.reactivestreams.Subscriber;
import org.reactivestreams.Subscription;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.transcribestreaming.model.AudioEvent;
import software.amazon.awssdk.services.transcribestreaming.model.AudioStream;

import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;

/**
 * This Subscription converts audio bytes received from the KVS stream into AudioEvents
 * that can be sent to the Transcribe service. It implements a simple demand system that will read chunks of bytes
 * from a KVS stream using the KVS parser library
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
public class KVSByteToAudioEventSubscription implements Subscription {

    private static final Logger logger = LoggerFactory.getLogger(KVSByteToAudioEventSubscription.class);

    private static final int CHUNK_SIZE_IN_KB = 4;
    private ExecutorService executor = Executors.newFixedThreadPool(1); // Change nThreads here!! used in SubmissionPublisher not subscription
    private AtomicLong demand = new AtomicLong(0); // state container
    private final Subscriber<? super AudioStream> subscriber;
    private final StreamingMkvReader streamingMkvReader;
    private String contactId;
    private OutputStream outputStream;
    private final FragmentMetadataVisitor.BasicMkvTagProcessor tagProcessor;
    private final FragmentMetadataVisitor fragmentVisitor;
    private final String track;

    public KVSByteToAudioEventSubscription(Subscriber<? super AudioStream> s, StreamingMkvReader streamingMkvReader,
                                           String contactId, OutputStream outputStream, FragmentMetadataVisitor.BasicMkvTagProcessor tagProcessor,
                                           FragmentMetadataVisitor fragmentVisitor, String track) {
        this.subscriber = Validate.notNull(s);
        this.streamingMkvReader = Validate.notNull(streamingMkvReader);
        this.contactId = Validate.notNull(contactId);
        this.outputStream = Validate.notNull(outputStream);
        this.tagProcessor = Validate.notNull(tagProcessor);
        this.fragmentVisitor = Validate.notNull(fragmentVisitor);
        this.track = Validate.notNull(track);
    }

    @Override
    public void request(long n) {
        if (n <= 0) {
            subscriber.onError(new IllegalArgumentException("Demand must be positive"));
        }

        demand.getAndAdd(n);
        //We need to invoke this in a separate thread because the call to subscriber.onNext(...) is recursive
        executor.submit(() -> {
            try {
                while (demand.get() > 0) {
                    // return byteBufferDetails and consume this with an input stream then feed to output stream
                    ByteBuffer audioBuffer = KVSUtils.getByteBufferFromStream(streamingMkvReader, fragmentVisitor, tagProcessor, contactId, CHUNK_SIZE_IN_KB, track);

                    if (audioBuffer.remaining() > 0) {

                        AudioEvent audioEvent = audioEventFromBuffer(audioBuffer);
                        subscriber.onNext(audioEvent);

                        //Write audioBytes to a temporary file as they are received from the stream
                        byte[] audioBytes = new byte[audioBuffer.remaining()];
                        audioBuffer.get(audioBytes);
                        outputStream.write(audioBytes);

                    } else {
                        subscriber.onComplete();
                        break;
                    }
                    demand.getAndDecrement();
                }
            } catch (Exception e) {
                subscriber.onError(e);
            }
        });
    }

    @Override
    public void cancel() {
        executor.shutdown();
    }

    private AudioEvent audioEventFromBuffer(ByteBuffer bb) {
        return AudioEvent.builder()
                .audioChunk(SdkBytes.fromByteBuffer(bb))
                .build();
    }
}
