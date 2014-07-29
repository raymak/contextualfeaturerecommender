#/* This Source Code Form is subject to the terms of the Mozilla Public
# * License, v. 2.0. If a copy of the MPL was not distributed with this
# * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

VERSION ?= $(shell python -c "import json;print json.load(open('package.json'))['version']")
TOP ?= $(shell pwd)
FOX=Aurora
NAME=featurerecommender

REMOTEMACHINE=testpilot1.webapp.scl3.mozilla.com
REMOTEDIR=/data/www/testpilotweb/addons

# see http://stackoverflow.com/questions/649246/is-it-possible-to-create-a-multi-line-string-variable-in-a-makefile
define HELPDOC

= targets =

  version   - print version (according to `package.json`)
  help      - this help.

  deps      - get dependencies, if any
  test      - calls both 'simple' and 'complex' tests
  addon     - make the addon, and the update.rdf
  deploy    - push the addon to testpilot server

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

addon: deps
	cd $(TOP)
	rm -f $(NAME).xpi $(NAME).update.rdf
	cfx xpi \
		--update-link https://testpilot.mozillalabs.com/addons/$(NAME).xpi \
		--update-url https://testpilot.mozillalabs.com/addons/$(NAME).rdf $(OPTS)

backup:
	ssh $(WHO)$(REMOTEMACHINE) 'cd $(REMOTEDIR); if [ -e "$(NAME).xpi" ]; then mv "$(NAME).xpi" "$(NAME).xpi.old"; fi;  if [ -e "$(NAME).update.rdf" ]; then mv "$(NAME).update.rdf" "$(NAME).update.rdf.old"; fi;'

deploy: addon backup
	cd $(TOP)
	scp -rp $(NAME).update.rdf $(NAME).xpi $(WHO)$(REMOTEMACHINE):$(REMOTEDIR)/


# doesn't quite work (permissions)
#undeploy:
#	ssh $(WHO)$(REMOTEMACHINE) 'cd $(REMOTEDIR); if [ -e "$(NAME).xpi.#old" ]; then mv "$(NAME).xpi.old" "$(NAME).xpi"; fi;  if [ -e "$#(NAME).update.rdf.old" ]; then mv "$(NAME).update.rdf.old" "$(#NAME).update.rdf"; fi;'


#.phony test-complex: test-all-arms-work test-study-dies test-mutex-timing test-elig-claimed
#
#
## NOTE: some of these 'include' the addon at startup, some don't.
#test-all-arms-work:  addon
#	cd $(TOP)/test/all-arms-work &&\
#	ln -fs $(TOP)/lib/arms.js . &&\
#	cfx run $(OPTS) -b /Applications/Firefox$(FOX).app/Contents/MacOS/firefox --addon $(TOP)/search-test-phase-1.xpi \
#	--static-args '{"addon":"$(TOP)/search-test-phase-1.xpi"}' ;
#
#test-study-dies:  addon
#	cd $(TOP)/test/study-dies &&\
#	cfx run $(OPTS) -b /Applications/Firefox$(FOX).app/Contents/MacOS/firefox \
#	--static-args '{"addon":"$(TOP)/search-test-phase-1.xpi"}' ;
#
#test-mutex-timing:  addon
#	cd $(TOP)/test/mutex-timing &&\
#	cfx run $(OPTS) -b /Applications/Firefox$(FOX).app/Contents/MacOS/firefox --addon $(TOP)/search-test-phase-1.xpi \
#	--static-args '{"addon":"$(TOP)/search-test-phase-1.xpi"}' ;
#
#test-elig-claimed:  addon
#	cd $(TOP)/test/elig-claimed &&\
#	cfx run $(OPTS) -b /Applications/Firefox$(FOX).app/Contents/MacOS/firefox \
#	--static-args '{"addon":"$(TOP)/search-test-phase-1.xpi"}' ;
#
#
#test: deps test-complex test-code-only
#
#test-code-only:
#	cd $(TOP) &&\
#	(cfx test $(OPTS)  -b /Applications/Firefox$(FOX).app/Contents/MacOS/firefox)
#
#experiment:
#	cat $(TOP)/../experiment/deploy.txt
#