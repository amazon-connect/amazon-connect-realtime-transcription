package com.amazonaws.kvstranscribestreaming;

import com.amazonaws.kinesisvideo.parser.utilities.FragmentMetadata;
import com.amazonaws.kinesisvideo.parser.utilities.FragmentMetadataVisitor;
import com.amazonaws.kinesisvideo.parser.utilities.MkvTag;
import com.amazonaws.transcribestreaming.KVSByteToAudioEventSubscription;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Optional;

/**
 * An MkvTagProcessor that will ensure that we are only reading until end of stream OR the contact id changes
 * from what is expected.
 */
public class KVSContactTagProcessor implements FragmentMetadataVisitor.MkvTagProcessor {
    private static final Logger logger = LoggerFactory.getLogger(KVSContactTagProcessor.class);

    private final String contactId;

    private boolean sameContact = true;
    private boolean stopStreaming = false;

    public KVSContactTagProcessor(String contactId) {
        this.contactId = contactId;
    }

    public void process(MkvTag mkvTag, Optional<FragmentMetadata> currentFragmentMetadata) {
        if ("ContactId".equals(mkvTag.getTagName())) {
            if (contactId.equals(mkvTag.getTagValue())) {
                sameContact = true;
            }
            else {
                logger.info("Contact Id in tag does not match expected, will stop streaming. "
                                + "contact id: %s, expected: %s",
                        mkvTag.getTagValue(), contactId);
                sameContact = false;
            }
        }
        if ("STOP_STREAMING".equals(mkvTag.getTagName())) {
            if ("true".equals(mkvTag.getTagValue())) {
                logger.info("STOP_STREAMING tag detected, will stop streaming");
                stopStreaming = true;
            }
        }
    }

    public boolean shouldStopProcessing() {
        return sameContact == false || stopStreaming == true;
    }
}
