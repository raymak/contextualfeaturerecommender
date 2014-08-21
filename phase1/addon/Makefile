#/* This Source Code Form is subject to the terms of the Mozilla Public
# * License, v. 2.0. If a copy of the MPL was not distributed with this
# * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

VERSION ?= $(shell python -c "import json;print json.load(open('package.json'))['version']")
TOP ?= $(shell pwd)
FOX=Aurora
NAME=featurerecommender
TPNAME=featurerecommender2-testpilot

ADDONFORTESTNAME=featurerecommender-testaddon

REMOTEMACHINE=testpilot1.webapp.scl3.mozilla.com
REMOTEDIR=/data/www/testpilotweb/addons


PEOPLEREMOTEMACHINE=people.mozilla.com
PEOPLEREMOTEDIR=~glind/wwwa/featurerecommender

# see http://stackoverflow.com/questions/649246/is-it-possible-to-create-a-multi-line-string-variable-in-a-makefile
define HELPDOC

= targets =

  version   - print version (according to `package.json`)
  help      - this help.

  deps      - get dependencies, if any
  test      - calls both 'simple' and 'complex' tests
  addon     - make the addon, and the update.rdf
  addon-tp     - make the addon, and the update.rdf

  deploy    - push the addon to testpilot server

  test-complex - complicated tests with setup
  test-code-only - simple tests

= variables =

  WHO       - ssh user for deploy (example:  "person@")
  OPTS      - options to pass to cfx various places

Note:  some targets are in the make file, some stuff is in `cfx`

endef
export HELPDOC

version:
	@echo $(VERSION)

help:
	@echo "$$HELPDOC"

deps:
	@# blushproof
	@#curl --create-dirs https://raw.githubusercontent.com/mozilla/blushproof/master/lib/bpUtil.js > lib/thirdparty/blushproof/bpUtil.js
	@#curl --create-dirs https://raw.githubusercontent.com/mozilla/blushproof/master/lib/blushlist.js > lib/thirdparty/blushproof/blushlist.js
	@# wget micropilot
	@#curl https://raw.github.com/gregglind/micropilot/dev/lib/micropilot.js > lib/micropilot.js
	@# wget bwclarks thing
	@#curl https://raw.github.com/gregglind/browser-search-engine/master/lib/browser-search-engine.js > lib/browser-search-engine.js

# this is the addon for safe distribution
addon: deps
	cd $(TOP)
	cfx xpi \
		--static-args='{"send_data": false, "test_mode": true, "arm_weights":[1,1,1,1,0]}' \
		--update-link https://people.mozilla.com/~glind/all/featurerecommender/$(NAME).xpi \
		--update-url https://people.mozilla.com/~glind/all/featurerecommender/$(NAME).update.rdf $(OPTS)

# this is the addon for tp distribution.
addon-tp: deps
	echo "addon-tp"
	cd $(TOP)
	rm -f $(TPNAME).xpi $(TPNAME).update.rdf
	cfx xpi \
		--static-args='{"send_data": true, "test_mode": false}' \
		--update-link https://testpilot.mozillalabs.com/addons/$(TPNAME).xpi \
		--update-url https://testpilot.mozillalabs.com/addons/$(TPNAME).update.rdf $(OPTS)
	mv $(NAME).xpi $(TPNAME).xpi
	mv $(NAME).update.rdf $(TPNAME).update.rdf

addon-for-tests: deps
	cd $(TOP)
	rm -f $(ADDONFORTESTNAME).xpi $(ADDONFORTESTNAME).update.rdf
	cfx xpi \
		--static-args='{"test_mode": true, "arm_weights":[0,0,1,0,0]}' \
		$(OPTS)
	mv $(NAME).xpi $(ADDONFORTESTNAME).xpi
	@#mv $(NAME).update.rdf $(ADDONFORTESTNAME).update.rdf

backup:
	ssh $(WHO)$(REMOTEMACHINE) 'cd $(REMOTEDIR); if [ -e "$(NAME).xpi" ]; then mv "$(TPNAME).xpi" "$(TPNAME).xpi.old"; fi;  if [ -e "$(TPNAME).update.rdf" ]; then mv "$(TPNAME).update.rdf" "$(TPNAME).update.rdf.old"; fi;'


people-deploy: addon
	cd $(TOP)
	scp -rp $(NAME).update.rdf $(NAME).xpi $(WHO)$(PEOPLEREMOTEMACHINE):$(PEOPLEREMOTEDIR)/
	# would be nice if then curled.

deploy: addon-tp backup
	cd $(TOP)
	scp -rp $(TPNAME).update.rdf $(TPNAME).xpi $(WHO)$(REMOTEMACHINE):$(REMOTEDIR)/



# doesn't quite work (permissions)
#undeploy:
#	ssh $(WHO)$(REMOTEMACHINE) 'cd $(REMOTEDIR); if [ -e "$(NAME).xpi.#old" ]; then mv "$(NAME).xpi.old" "$(NAME).xpi"; fi;  if [ -e "$#(NAME).update.rdf.old" ]; then mv "$(NAME).update.rdf.old" "$(#NAME).update.rdf"; fi;'


.phony test-complex: test-contracts-across-restart


## NOTE: some of these 'include' the addon at startup, some don't.
test-contracts-across-restart:  addon-for-tests
	cd $(TOP)/test/contracts-across-restart &&\
	(cfx run $(OPTS) -b /Applications/Firefox$(FOX).app/Contents/MacOS/firefox \
	--static-args '{"addon":"$(TOP)/$(ADDONFORTESTNAME).xpi"}')

#test-all-arms-work:  addon-for-tests
#	cd $(TOP)/test/all-arms-work &&\
#	ln -fs $(TOP)/lib/arms.js . &&\
#	cfx run $(OPTS) -b /Applications/Firefox$(FOX).app/Contents/MacOS/firefox --addon $(TOP)/search-test-phase-1.xpi \
#	--static-args '{"addon":"$(TOP)/search-test-phase-1.xpi"}' ;
#
#test-study-dies:  addon-for-tests
#	cd $(TOP)/test/study-dies &&\
#	cfx run $(OPTS) -b /Applications/Firefox$(FOX).app/Contents/MacOS/firefox \
#	--static-args '{"addon":"$(TOP)/search-test-phase-1.xpi"}' ;
#
#test-mutex-timing:  addon-for-tests
#	cd $(TOP)/test/mutex-timing &&\
#	cfx run $(OPTS) -b /Applications/Firefox$(FOX).app/Contents/MacOS/firefox --addon $(TOP)/search-test-phase-1.xpi \
#	--static-args '{"addon":"$(TOP)/search-test-phase-1.xpi"}' ;
#
#test-elig-claimed:  addon-for-tests
#	cd $(TOP)/test/elig-claimed &&\
#	cfx run $(OPTS) -b /Applications/Firefox$(FOX).app/Contents/MacOS/firefox \
#	--static-args '{"addon":"$(TOP)/search-test-phase-1.xpi"}' ;
#
#

test: deps test-complex test-code-only

test-code-only:
	cd $(TOP) &&\
	cfx test $(OPTS) -b /Applications/Firefox$(FOX).app/Contents/MacOS/firefox

#experiment:
#	cat $(TOP)/../experiment/deploy.txt
#