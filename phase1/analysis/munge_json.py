#!/usr/bin/python

import fileinput
import json
import csv

fields = [u'experiment',
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

with open('firstpass.csv', 'wb') as csvfile:
	writer = csv.writer(csvfile)
	writer.writerow(fields)

	for line in fileinput.input():
		id, payload = line.split("\t",1)
		payload = json.loads(json.loads(payload)["dp"])
		entry = []
		for f in fields:
			entry.append(payload[f])
		writer.writerow(entry)


