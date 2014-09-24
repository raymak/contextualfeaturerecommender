#!/usr/bin/python

import fileinput
import simplejson as json
import csv
import sys

fields = [u'experiment',
		u'addon_version', 
		u'test_mode', 
		u'locale', 
		u'experiment_version', 
		u'systemversion', 
		u'os',
		u'systemname',
		u'userid',  
		u'ts',
		u'arm',
		u'type', u'value', u'triggerid']

print "\t".join(fields)

for line in fileinput.input():
	payload = json.loads(json.loads(line)["dp"])
	entry = []
	for f in fields:
		entry.append(json.dumps(payload[f]))
	print "\t".join(str(e) for e in entry).strip()