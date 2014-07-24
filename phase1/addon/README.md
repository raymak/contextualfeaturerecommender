#Instructions

## Running

### Using cfx tool from addon sdk

In the root addon directory, enter:
	
	cfx run

## Test Mode

Sets the "test_mode" flag when sending data.

### Setting

To explicitly force the test_mode flag to true or false, set the "test_mode" property to "true" or "false" using static-args:

	cfx run --static-args="{\"test_mode\": true}"

Once the flag is set, it's stored in preferences and is automatically retrieved when it's not explicitly set. If the flag has not been set before and is not explicitly set as well, by default test_mode=false is used.