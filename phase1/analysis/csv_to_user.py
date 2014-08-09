#!/usr/bin/python

# input: csv-formatted stream, with each line corresponding to the payload for a message
# output: csv-formatted stream, with each line corresponding to higher-level features for a specific user
# assumes the input messages from a specific user are contiguous    

import fileinput
import json
import csv
from collections import defaultdict

inds = {}

counter = 0

def main():
    # print inds
    parseMessages()

    print counter



# returns an array of parsed messages
def parseMessages():
    fieldsnames = [u'experiment',
        u'addon_version', 
        u'test_mode', 
        u'locale', 
        u'experiment_version', 
        u'systemversion', 
        u'os',
        u'systemname',
        u'userid',  
        u'arm',
        u'ts',
        u'type', u'value',   u'triggerid']

    
    currUserId = None
    userMessages = []


    for line in fileinput.input():   
        if fileinput.isfirstline():
            fields = line.strip().split('\t')
            
            for i in range(len(fields)):
                inds[fields[i]] = i
                

        else: 
            jsonrow = [json.loads(val) for val in line.split('\t')]
            
            userId = jsonrow[inds['userid']]
            currUserId = currUserId or userId

            if userId != currUserId:
                processUser(userMessages, currUserId)
                currUserId = userId
                userMessages = []

            userMessages.append(jsonrow)

    processUser(userMessages, currUserId)   # last line 



def processUser(userMessages, userId):
    
    hasUserSeenRecommendation(userMessages, 'newbookmark')






# returns a dictionary with the userid as its key and the array of messages of
# a user as its value
def getMessagesByUserIds(messagesArr):
    messagesDict = defaultdict(list)

    for message in messagesArr:
        messagesDict[message['userid']].append(message)

    return messagesDict


# filters by: experiment version, test_mode
def basicFilter(messagesArr):

    messagesArr = [message for message in messagesArr 
        if message['experiment_version'] == "2.0.0"  # Experiment Version
        and message['test_mode'] == False   # Test Mode
        ]
    

    return messagesArr

def count():
    global counter
    counter += 1


def hasUserSeenRecommendation(messagesArr, featurename):

    for message in messagesArr:
        if message[inds['triggerid']] == featurename and message[inds['type']] == 'PANELSHOW': return True
    count()
    return False




if __name__ == "__main__":
    main()
