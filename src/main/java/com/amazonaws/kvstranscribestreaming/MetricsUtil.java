package com.amazonaws.kvstranscribestreaming;

import com.amazonaws.services.cloudwatch.AmazonCloudWatch;
import com.amazonaws.services.cloudwatch.model.MetricDatum;
import com.amazonaws.services.cloudwatch.model.PutMetricDataRequest;
import com.amazonaws.services.cloudwatch.model.StandardUnit;

import java.time.Instant;
import java.util.Date;

/*
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
public class MetricsUtil {

    private static String NAMESPACE = "KVSTranscribeStreamingLambda";
    private final AmazonCloudWatch amazonCloudWatch;

    public MetricsUtil(AmazonCloudWatch amazonCloudWatch) {
        this.amazonCloudWatch = amazonCloudWatch;
    }

    public void recordMetric(final String metricName, long value) {
        MetricDatum metricData = new MetricDatum().withMetricName(metricName)
                .withTimestamp(Date.from(Instant.now()))
                .withUnit(StandardUnit.Count)
                .withValue(Double.valueOf(value));

        PutMetricDataRequest metricRequest = new PutMetricDataRequest()
                .withNamespace(NAMESPACE)
                .withMetricData(metricData);

        amazonCloudWatch.putMetricData(metricRequest);
    }
}
