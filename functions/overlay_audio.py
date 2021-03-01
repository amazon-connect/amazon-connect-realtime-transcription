import io
import json
import boto3
import os

from pydub import AudioSegment

def lambda_handler(event, context):
    
    contact_id_info = event['target']['Key']
    print(contact_id_info)
    contact_array =  contact_id_info.split('_')
    contact_Id = contact_array[0]
    print(contact_Id)
    
    handle_dynamo(event, contact_Id)

def handle_dynamo(event, contact_Id):
    
    bucket_name = event['target']['Bucket']
    audio_file = event['target']['Key']
    
    combined_loc = bucket_name + "/" + audio_file
    
    dynamodb = boto3.resource('dynamodb')
    
    table_name = os.getenv('contactDetailsTableName')
    print(table_name)
    
    table = dynamodb.Table(table_name)

    response = table.get_item(
       Key={
            'contactId': contact_Id
        }
    )
    item = response['Item']
    try:
        status = item['mergeStatus']
    except KeyError:
        print("no mergeStatus")
        status=""
    
    if status == "":
        print('Status is blank, updating with processing')
        table.update_item(
            Key={'contactId': contact_Id},
             UpdateExpression="set mergeStatus=:p",  
             ExpressionAttributeValues={
                ':p': 'Processing'
                }
        )
        print('Audio Merge Code')
        status = merge_audio(event)
        print('merge_audio is complete, update dynamo')
        
        table.update_item(
            Key={'contactId': contact_Id},
             UpdateExpression="set mergeStatus=:p,combinedAudio=:a",
             ExpressionAttributeValues={
                ':p': status,
                ':a': combined_loc
                }
        )
    elif status == "Processing":
        print('Status is processing, return')
    elif status == "Complete":
        print('Status is complete, we should never get here')  
        
    
def merge_audio(event):
    print(event)
    s3r = boto3.resource('s3')
    source1 = event['sources'][0]
    source2 = event['sources'][1]
    print(s3r.Object(
        source1['Bucket'],
        source1['Key']))
    
    source1_buf = io.BytesIO()
    source2_buf = io.BytesIO()
    source1 = event['sources'][0]
    source2 = event['sources'][1]
    s3r.Object(
        source1['Bucket'],
        source1['Key']
    ).download_fileobj(source1_buf)
    s3r.Object(
        source2['Bucket'],
        source2['Key']
    ).download_fileobj(source2_buf)

    sound1 = AudioSegment.from_wav(source1_buf)
    sound2 = AudioSegment.from_wav(source2_buf)
    one_track = sound1.overlay(sound2)
    combined_buf = io.BytesIO()
    one_track.export(combined_buf, format='wav')
    combined_buf.seek(0)
    
    try:
        s3r.Object(
        event['target']['Bucket'],
        event['target']['Key']
    ).upload_fileobj(combined_buf)
        print('Completed merge and upload')
        return 'Complete'
    except Exception as e:
        print(e)
        return 'Error'

