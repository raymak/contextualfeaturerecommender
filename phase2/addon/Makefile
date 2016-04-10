# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/. 
# 
# 
VERSION ?= $(shell python -c "import json;print(json.load(open('package.json'))['version'])")
BUILD_ROOT_DIR = build
BUILD_NAMES = $(sort $(notdir $(wildcard $(BUILD_ROOT_DIR)/*)))

# sets up a certain experiment configuration by copying all the contents of a certain 
# build/[config-name] to the main directory, most notably the prefs.json file
# e.g. make 1-day-test
# 
$(BUILD_NAMES):
	@echo "setting up $@..."
	@cp -R -v $(BUILD_ROOT_DIR)/$@/* ./

xpi:
	jpm xpi
	VAR="$(name)"; \
	if [ -n "$$VAR"]; then mv *.xpi $(name).xpi && echo "non-empty"; fi

clean: 
	rm *.xpi


