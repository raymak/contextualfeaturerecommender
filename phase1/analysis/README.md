# Instructions

## Pipeline

The full pipeline can be used by

	cat raw_data_sorted_by_user | python munge_json.py | python event_to_user.py | python user_to_aggregates.py

### raw_data_sorted_by_user

The input of the pipleline are the raw messages sent to the server. These log messages must be sorted by user before feeding munge_json.py, so that messages corresponding to a particular user are all in a contiguous segment.

### munge_json.py

Reads the top CFR messages and outputs the main datapayload from the "dp" field.
Input: logged JSON object per line, sorted by userids
Output: tab-delimited CSV-formatted table with each row corresponding to an event emmited from CFR. Each column corresponds to one field of the event message.

### event_to_user.py

Reads the event messages and outputs basic facts or values about the user and their interaction with each of the features.
Input: tab-delimited CSV-formatted table with an event message per line. The table must have a header
Output: tab-delimited CSV-formatted table with each row corresponding to a user. Each column corresponds to a fact or value. 

### user_to_aggregates.py

Reads basic facts or values about the users and output aggregate statistics.
Input: tab-delimited CSV-formatted table with facts about a user per line. The table must have a header.
Output: tab-delimited CSV-formatted table with each row corresponding to an arm/feature pair.



