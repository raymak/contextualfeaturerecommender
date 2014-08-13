#Instructions

## Running

### Using cfx tool from addon sdk

In the root addon directory, enter:
	
	cfx run

## Test Mode

Sets the "test_mode" flag when sending data.

### Usage

To explicitly force the test_mode flag to true or false, set the "test_mode" property to "true" or "false" using static-args:

	cfx run --static-args="{\"test_mode\": true}"

Once the flag is set, it's stored in preferences and is automatically retrieved when it's not explicitly set. If the flag has not been set before and is not explicitly set as well, by default test_mode=true is used.

## Send Data Mode

Determines if the data is sent to the Google Analytics server for collection.

### Usage

To explicitly force the data to be sent to the server, set the "send_data" property to "true" or "false" using static-args:
	cfx run --static-args="{\"send_data\": true}"

Once the flag is set, it's stored in preferences and is automatically retrieved when it's not explicitly set. If the flag has not been set before and is not explicitly set as well, by default send_data=true is used.

---
## Arms of the Experiment

The experiment consists of 5 possible arms. The arm for a user is selected randomly the first time the addon is run. 

### Explanation

There are three axes defining the arms:

* Basis: specifies what the basis for inferring the recommendations is.
    * contextual: is based on the context of the user.


* Explanation: specifies if messages explaining why the recommendation is given to the user should be provided.
    * unexplained
    * explained


* UI: specifies the interaction of the system with the user.
    * doorhanger-active: a panel is attached to a button and pops up everytime there is a new recommendation.
	* doorhanger-passive: a button is lit up when a new recommendation is available, but the panel does not show up until the user clicks the button.
	* none: the user does not receive recommendations.

### List of Arms

- <arm_weights index> -> <basis>, <explanation>, <ui>

- 0 -> contextual, unexplained, doorhanger-active
- 1 -> contextual, unexplained, doorhanger-passive
- 2 -> contextual, explained, doorhanger-active
- 3 -> contextual, explained, doorhanger-passive
- 4 -> contextual, unexplained, none

### Usage

To provide the relative probabilities of arms being selected, the arm_weights property should be set using static-args as an array of 5 number. The relative ratio of the numbers specifies how the probability is distributed among the arms. 

	cfx run --static-args="{\"arm_weights\": [1, 1, 0, 1, 2]}"

If the weights are not set using the static-arms, the default weight array is [1, 1, 1, 1, 1] (equally likely).

Example 1: Sets equal probability of being selected, could also use [2,2,2,2,2]--only the relative ratio matters

	cfx run --static-args="{\"arm_weights\": [1,1,1,1,1]}"

Example 2: Always the control arm is selected. in general, any of the weights could be zero.
	
	cfx run --static-args="{\"arm_weights\":[0,0,0,0,1]}"







