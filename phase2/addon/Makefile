

BUILD_ROOT_DIR = build
BUILD_NAMES = $(sort $(notdir $(wildcard $(BUILD_ROOT_DIR)/*)))

# sets up a certain experiment configuration by copying all the contents of a certain 
# build/[config-name] to the main directory, most notably the prefs.json file
# e.g. make 1-day-test
# 
$(BUILD_NAMES):
	@echo "setting up $@..."
	@cp -R -v $(BUILD_ROOT_DIR)/$@/* ./

.PHONY: clean
clean: 
	rm *.xpi


