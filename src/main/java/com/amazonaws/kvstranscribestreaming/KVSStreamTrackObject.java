package com.amazonaws.kvstranscribestreaming;

import com.amazonaws.kinesisvideo.parser.mkv.StreamingMkvReader;
import com.amazonaws.kinesisvideo.parser.utilities.FragmentMetadataVisitor;

import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.file.Path;

public class KVSStreamTrackObject {
    private InputStream inputStream;
    private StreamingMkvReader streamingMkvReader;
    private FragmentMetadataVisitor.BasicMkvTagProcessor tagProcessor;
    private FragmentMetadataVisitor fragmentVisitor;
    private Path saveAudioFilePath;
    private FileOutputStream outputStream;
    private String trackName;

    public KVSStreamTrackObject(InputStream inputStream, StreamingMkvReader streamingMkvReader,
                                FragmentMetadataVisitor.BasicMkvTagProcessor tagProcessor, FragmentMetadataVisitor fragmentVisitor,
                                Path saveAudioFilePath, FileOutputStream outputStream, String trackName) {
        this.inputStream = inputStream;
        this.streamingMkvReader = streamingMkvReader;
        this.tagProcessor = tagProcessor;
        this.fragmentVisitor = fragmentVisitor;
        this.saveAudioFilePath = saveAudioFilePath;
        this.outputStream = outputStream;
        this.trackName = trackName;
    }

    public InputStream getInputStream() {
        return inputStream;
    }

    public StreamingMkvReader getStreamingMkvReader() {
        return streamingMkvReader;
    }

    public FragmentMetadataVisitor.BasicMkvTagProcessor getTagProcessor() {
        return tagProcessor;
    }

    public FragmentMetadataVisitor getFragmentVisitor() {
        return fragmentVisitor;
    }

    public Path getSaveAudioFilePath() {
        return saveAudioFilePath;
    }

    public FileOutputStream getOutputStream() {
        return outputStream;
    }

    public String getTrackName() {
        return trackName;
    }
}
