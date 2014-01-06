//////////////////
// BLOCK MODELS //
//////////////////

// block finder
function block_finder_model() {

    // members
    this.blocks = ko.observableArray();

    // refresh
    this.refresh = function() {
        $.get('/blocks/all.json', function (data) {
            // clear existing data
            this.blocks.removeAll();
            // check for no data
            if (!data)
                return;
            // add blocks
            ko.utils.arrayForEach(data, function(block) {
                this.blocks.push(new block_model(block));
            }.bind(this));
        }.bind(this));
    }.bind(this);

    // initial refresh
    this.refresh();

};

// block form
function block_form_model() {

    // members
    this.block = ko.observable();
    this.file_viewer = new file_viewer_model();
    this.errors = ko.observable();
    this.saving = ko.observable(false);
    this.sidebar = ko.observable();

    // inherit options
    this.inherit_options = ko.observableArray([
        { 'text': 'No', value: '0' },
        { 'text': 'Yes', value: '1' },
        { 'text': 'Inherit', value: '2' }
    ]);

    // block typeaheads
    this.query_blocks = function(query, process) {
        return $.get('/blocks/search.json', { query: query }, function (data) {
            if (data) return process(data);
        });
    };

    // refresh
    this.refresh = function() {
        // get block from url
        $.post(document.URL + '.json', function (block) {
            // verify data
            if (!block) return;
            // set up block
            this.block(new block_model(block));
            // subscribe viewer to block query
            this.file_viewer.subscribe(this.block().file_query);
            // run initial query
            this.file_viewer.query(this.block().file_query());
        }.bind(this));
    }.bind(this);

    // save
    this.save = function() {
        // verify not already saving
        if (this.saving()) return;
        // set saving
        this.saving(true);
        // save show
        $.post(document.URL + '.json', ko.mapping.toJSON(this.block()), function (data, status, request) {
                // check for validation errors
                if (request.getResponseHeader('errors')) {
                    this.errors(data);
                    this.saving(false);
                } else {
                    // redirect to shows
                    window.location = '/blocks';
                }
            }.bind(this)).fail(function() {
                this.saving(false);
            }.bind(this));
    }.bind(this);

    // cancel
    this.cancel = function() {
        window.location = '/blocks';
    };

    // initialize
    this.refresh();

};

// block item
function block_item_model(block_item) {

    // members
    this.percentage = ko.observable();
    this.duration = ko.observable();
    this.file = ko.observable();
    this.child_block = ko.observable();
    this.selected = ko.observable(false);

    // select
    this.select = function() {
        this.selected(!this.selected());
    }.bind(this);

    // duration calculation
    this.entered_duration = ko.computed({

        read: function () {
            return this.duration();
        },
        write: function (value) {

            // make sure we have a valid value
            if (!value) return;
            // normalize duration
            var normalize_duration = Helper.normalize_duration(value);
            // set duration
            this.duration(normalize_duration);
            // clear percentage
            this.percentage(null);

        }, owner: this

    });

    // duration calculation
    this.entered_percentage = ko.computed({

        read: function () {
            return this.percentage();
        },
        write: function (value) {

            // make sure we have a valid value
            if (!value) return;
            // set percentage
            this.percentage(value);
            // clear duration
            this.duration(null);

        }, owner: this

    });

    // mapping
    ko.mapping.fromJS(block_item, {
        include: ['duration', 'percentage', 'child_block', 'file']
    }, this);

};

// block layout
function block_layout_model() {

    // members
    this.block = ko.observable();
    this.saving = ko.observable(false);
    this.sidebar = ko.observable();
    this.file_finder = new file_finder_model();
    this.block_finder = new block_finder_model();
    this.errors = ko.observableArray();

    // selected block items count
    this.selected_block_items_count = ko.computed(function() {

        // verify we have a block
        if (!this.block()) return 0;

        var count = 0;
        ko.utils.arrayForEach(this.block().block_items(), function(block_item) {
            if (block_item.selected()) { count++ };
        }.bind(this));
        return count;

    }.bind(this));

    // duration calculation
    this.total_duration = ko.computed(function() {

        // verify we have a block
        if (!this.block())
            return '00:00:00';

        var total_hours = 0;
        var total_minutes = 0;
        var total_seconds = 0;
        // get total duration
        ko.utils.arrayForEach(this.block().block_items(), function(block_item) {
            // get item duration
            var block_item_duration = block_item.file() ? block_item.file().duration() : block_item.duration();
            // verify we have something (not percentage)
            if (!block_item_duration)
                return;
            // calculate totals
            var duration_parts = block_item_duration.split(':');
            total_hours += parseInt(duration_parts[0]);
            total_minutes += parseInt(duration_parts[1]);
            total_seconds += parseInt(duration_parts[2]);
        });

        // get additional hours
        return Helper.calculate_duration(total_hours, total_minutes, total_seconds);

    }, this);

    // percentage calculation
    this.total_percentage = ko.computed(function() {

        // verify we have a block
        if (!this.block())
            return 0;

        var total_percentage = 0;
        ko.utils.arrayForEach(this.block().block_items(), function(block_item) {
            if (block_item.percentage() != null)
                total_percentage += parseFloat(block_item.percentage());
        });
        return total_percentage;

    }, this);

    // select all blocks
    this.select_all = function() {

        // verify we have a block
        if (!this.block()) return;
        // if we have no selected block items, select them all
        var none_selected = (this.selected_block_items_count() == 0);
        // select all blocks
        ko.utils.arrayForEach(this.block().block_items(), function(block_item) {
            block_item.selected(none_selected);
        }.bind(this));

    }.bind(this);

    this.create_block_item = function(obj) {

        // get constructor name
        var constructor_name = obj.constructor.name;
        // create new block item
        var block_item = new block_item_model({});
        if (constructor_name == 'block_model')
            block_item.child_block(obj);
        else if (constructor_name == 'file_model')
            block_item.file(obj);
        // success
        return block_item;

    }.bind(this);

    this.add_block = function(block) {
        var block_item = new block_item_model(this);
        block_item.percentage(0);
        block_item.child_block(block);
        this.block_items.push(block_item);
    }.bind(this);

    this.add_files = function() {
        ko.utils.arrayForEach(this.file_finder.files(), function(file) {
            if (!file.selected())
                return;
            var file_item = new block_item_model(this);
            file_item.file(file);
            this.block_items.push(file_item);
        }.bind(this));
    }.bind(this);

    // remove items
    this.remove = function() {

        var selected_items = [];
        // get all selected items
        ko.utils.arrayForEach(this.block().block_items(), function(block_item) {
           if (block_item.selected()) selected_items.push(block_item);
        });
        // remove all selected items
        this.block().block_items.removeAll(selected_items);

    }.bind(this);

    // refresh
    this.refresh = function() {
        // get block from url
        $.post(document.URL + '.json', function (block) {
            if (!block) return;
            this.block(new block_model(block));
        }.bind(this));
    }.bind(this);

    // save
    this.save = function() {
        // verify not already saving
        if (this.saving()) return;
        // set saving
        this.saving(true);
        // save show
        $.post(document.URL + '.json', ko.mapping.toJSON(this.block()), function (data, status, request) {
                // check for validation errors
                if (request.getResponseHeader('errors')) {
                    this.errors(data);
                    this.saving(false);
                } else {
                    // redirect to blocks
                    window.location = '/blocks';
                }
            }.bind(this)).fail(function() {
                this.saving(false);
            }.bind(this));
    }.bind(this);

    // cancel
    this.cancel = function() {
        window.location = '/blocks';
    };

    // initialize
    this.refresh();
    // initial query
    this.file_finder.clear();

};

// block model
function block_model(block) {

    // members
    this.id = ko.observable();
    this.title = ko.observable();
    this.description = ko.observable();
    this.initial_key = ko.observable();
    this.initial_energy = ko.observable();
    this.initial_genre = ko.observable();
    this.file_query = ko.observable();
    this.weighted = ko.observable();
    this.itemized = ko.observable();
    this.block_weights = ko.observableArray();
    this.block_items = ko.observableArray();
    this.block_harmonic_names = ko.observableArray();
    this.harmonics = ko.observableArray();
    this.backup_blocked = ko.observable();
    this.backup_block = ko.observable();
    this.selected = ko.observable(false);

    // select
    this.select = function() {
        this.selected(!this.selected());
    }.bind(this);

    // add block criterium
    this.add_block_weight = function() {
        this.block_weights.push(new block_weight_model());
    }.bind(this);

    // remove block criterium
    this.remove_block_weight = function(block_weight) {
        this.block_weights.remove(block_weight)
    }.bind(this);

    // edit
    this.edit = function(data, e) {
        window.location = '/blocks/edit/' + this.id();
        e.stopPropagation();
    }.bind(this);

    // layout
    this.layout = function(data, e) {
        window.location = '/blocks/layout/' + this.id();
        e.stopPropagation();
    }.bind(this);

    // mapping
    ko.mapping.fromJS(block, {
        'include': [
            'title',
            'description',
            'file_query',
            'block_weights',
            'block_harmonic_ids',
            'backup_block',
        ],
        'block_weights': { create: function(options) { return new block_weight_model(options.data);} },
        'block_items': { create: function(options) { return new block_item_model(options.data);} },
        'backup_block': { create: function(options) { return new block_model(options.data) } },
        'block': { create: function(options) { return new block_model(options.data); } }
    }, this);

    // initialize flags
    this.weighted(block.weighted || (this.block_weights().length > 0 ? true : false));
    this.itemized(block.itemized || (this.block_items().length > 0 ? true : false));
    this.backup_blocked(block.backup_blocked || (block.backup_block ? true : false));

    // weighted subscription
    this.weighted.subscribe(function(value) {
        if (value) this.block_weights.push(new block_weight_model({ 'weight': '1' }));
        else this.block_weights.removeAll();
    }.bind(this));

    // backup block subscription
    this.backup_blocked.subscribe(function(value) {
        if (value) this.backup_block(new block_model({}));
        else this.backup_block(null);
    }.bind(this));

};

// block weight
function block_weight_model(block_weight) {

    // members
    this.weight = ko.observable();
    this.file_query = ko.observable();
    // mapping
    ko.mapping.fromJS(block_weight, {
        'include': ['weight', 'file_query']
    }, this);

};

// blocks index model
function blocks_index_model() {

    // members
    this.blocks = ko.observableArray();

    // selected blocks count
    this.selected_blocks_count = ko.computed(function() {
        var count = 0;
        // get selected blocks
        ko.utils.arrayForEach(this.blocks(), function(block) {
            if (block.selected()) { count++; }
        }.bind(this));
        return count;
    }.bind(this));

    // select all blocks
    this.select_all = function() {
        // if we have no selected blocks, select them all
        var none_selected = (this.selected_blocks_count() == 0);
        // select all blocks
        ko.utils.arrayForEach(this.blocks(), function(block) {
            block.selected(none_selected);
        }.bind(this));
    }.bind(this);

    // create
    this.create = function() {
        window.location = '/blocks/create';
    }.bind(this);

    // delete blocks
    this.delete_block = function() {

        var selected_block_ids = [];
        var selected_blocks = [];
        // get selected blocks
        ko.utils.arrayForEach(this.blocks(), function(block) {
            if (block.selected()) {
                selected_block_ids.push(block.id());
                selected_blocks.push(block);
            }
        }.bind(this));

        // delete selected blocks & refresh
        $.post('/blocks/delete.rawxml', { 'ids': selected_block_ids }, function () {
            // remove selected blocks
            this.blocks.removeAll(selected_blocks);
        }.bind(this));

    }.bind(this);

    // refresh
    this.refresh = function() {

        // get blocks
        $.get('/blocks/all.json', function (blocks) {
            if (!blocks) return;
            ko.utils.arrayForEach(blocks, function(block) {
                this.blocks.push(new block_model(block));
            }.bind(this));
        }.bind(this));

    };

    // initialize
    this.refresh();

};

//////////////////////
// CLOUDCAST MODELS //
//////////////////////

// cloudcast display
function cloudcast_display_model() {

    // poll interval
    var poll_inverval;
    // members
    this.status = ko.observable();

    // talkover input enable
    this.toggle_input_enabled = function(input) {

        var enabled;
        // get current input state
        if (input == 'schedule')
            enabled = this.status().schedule_input_enabled();
        else if (input == 'show')
            enabled = this.status().show_input_enabled();
        else if (input == 'talkover')
            enabled = this.status().talkover_input_enabled();
        else if (input == 'master')
            enabled = this.status().master_input_enabled();

        // send off input enabled
        $.get('/engine/enable_input.rawxml', { input: input, enabled: !enabled });

    }.bind(this);

    // loop function
    this.loop = function(seconds) {

        /////////////
        // GENERAL //
        /////////////

        // get current generated on
        var client_generated_on = this.status().client_generated_on();
        // get generated date
        var client_generated_on_date = Helper.date(client_generated_on);
        // add the number of seconds we have been looping, set as updated date
        var updated_on_date = new Date(client_generated_on_date.getTime() + (seconds * 1000));
        // get updated on
        var updated_on = Helper.date_datetime_ex(updated_on_date);
        this.status().updated_on_time(Helper.datetime_time(updated_on));

        //////////
        // FILE //
        //////////

        // get current file played on
        var current_client_schedule_file_played_on = this.status().current_client_schedule_file_played_on();
        // verify we have a file
        if (current_client_schedule_file_played_on) {

            // convert to date
            var current_client_schedule_file_played_on_date = Helper.date(current_client_schedule_file_played_on);
            // calculate elapsed seconds for the file
            var current_file_elapsed_seconds
                = Helper.date_date_seconds(current_client_schedule_file_played_on_date, updated_on_date);
            // get the duration of the elapsed seconds
            var current_file_elapsed = Helper.seconds_duration(current_file_elapsed_seconds);
            this.status().current_file_elapsed(current_file_elapsed);
            // get current file duration
            var current_file_duration = this.status().current_file_duration();
            // get the seconds of the file duration
            var current_file_duration_seconds = Helper.duration_seconds(current_file_duration);
            // get remaining seconds
            var current_file_remaining_seconds = current_file_duration_seconds - current_file_elapsed_seconds;
            // get the duration of the remaining seconds
            var current_file_remaining = Helper.seconds_duration(current_file_remaining_seconds);
            this.status().current_file_remaining(current_file_remaining);
            // calculate file percentage complete
            var current_file_percentage = (current_file_elapsed_seconds / current_file_duration_seconds) * 100;
            this.status().current_file_percentage(current_file_percentage);
            // get the seconds of the file post
            if (this.status().current_file_post()) {
                var current_file_post_seconds = Helper.duration_seconds(this.status().current_file_post());
                // calculate file post percentage
                var current_file_post_percentage = (current_file_post_seconds / current_file_duration_seconds) * 100;
                this.status().current_file_post_percentage(current_file_post_percentage);
            } else {
                this.status().current_file_post_percentage(0);
            }

        } else {

            this.status().current_file_elapsed('00:00:00');
            this.status().current_file_percentage(0);

        }

        //////////
        // SHOW //
        //////////

        // get current schedule start on
        var current_client_schedule_start_on = this.status().current_client_schedule_start_on();
        // verify we have a show
        if (current_client_schedule_start_on) {

            // convert to date
            var current_client_schedule_start_on_date = Helper.date(current_client_schedule_start_on);
            // calculate elapsed seconds for the show
            var current_show_elapsed_seconds
                = Helper.date_date_seconds(current_client_schedule_start_on_date, updated_on_date);
            // get the duration of the elapsed seconds
            var current_show_elapsed = Helper.seconds_duration(current_show_elapsed_seconds);
            this.status().current_show_elapsed(current_show_elapsed);
            // get current show duration
            var current_show_duration = this.status().current_show_duration();
            // get the seconds of the show duration
            var current_show_duration_seconds = Helper.duration_seconds(current_show_duration);
            // get remaining seconds
            var current_show_remaining_seconds = current_show_duration_seconds - current_show_elapsed_seconds;
            // get the duration of the remaining seconds
            var current_show_remaining = Helper.seconds_duration(current_show_remaining_seconds);
            this.status().current_show_remaining(current_show_remaining);
            // calculate file percentage complete
            var current_show_percentage = (current_show_elapsed_seconds / current_show_duration_seconds) * 100;
            this.status().current_show_percentage(current_show_percentage);

        } else {

            this.status().current_show_elapsed('00:00:00');
            this.status().current_show_percentage(0);

        }

    }.bind(this);

    this.poll = function() {
        $.get('/engine/status.json', null, function (status_js) {

            // clear existing loop interval
            clearInterval(poll_inverval);
            // update status object
            if (!this.status())
                this.status(new status_model(status_js));
            else
                this.status().update(status_js);

            var seconds = 0;
            // do initial loop update
            this.loop(seconds);
            // create new loop interval
            poll_inverval = setInterval(function() {
                // update seconds
                seconds += 1;
                // execute the loop
                this.loop(seconds);
            }.bind(this), 1000);

        }.bind(this));
    }.bind(this);

    // show post set modal
    this.show_post = function() {

        // reset modal
        modal.reset();
        // set up modal
        modal.title('SET POST')
        modal.text('NEW POST');
        modal.ok_text('SAVE');
        modal.value(this.status().current_file_post() ? this.status().current_file_post() : '00:00:');
        modal.placeholder('00:00:00');
        modal.type('input');
        modal.ok = this.set_post;
        // show modal
        modal.show();

    }.bind(this);

    // set post (current file)
    this.set_post = function() {
        // get post
        var post = modal.value();
        // set post
        $.get('/files/set_post.rawxml', {
            'post': post,
            'id': this.status().current_file_id()
        }, function () {
            // set post (before standard update)
            this.status().current_file_post(post);
            // hide modal
            modal.hide();
        }.bind(this));
    }.bind(this);

    // poll engine for status
    setInterval(function() {
        this.poll();
    }.bind(this), 5000);
    // initial poll
    this.poll();

};

/////////////////
// FILE MODELS //
/////////////////

// file finder
function file_finder_model() {

    // members
    this.query = ko.observable();
    this.files = ko.observableArray();

    // file finder
    this.query.subscribe(function(value) {
        $.get('/files/search.json', { query: value }, function (data) {
            // clear existing data
            this.files.removeAll();
            // check for no data
            if (!data)
                return;
            // add files
            ko.utils.arrayForEach(data, function(file) {
                this.files.push(new file_model(file));
            }.bind(this));
        }.bind(this));
    }.bind(this));

    this.clear = function() {
        this.query('');
    }.bind(this);

};

// file
function file_model(file) {

    // members
    this.selected = ko.observable(false);
    // properties
    this.id = ko.observable();
    this.found_on = ko.observable();
    this.modified_on = ko.observable();
    this.last_played = ko.observable();
    this.last_scheduled = ko.observable();
    this.date = ko.observable();
    this.available = ko.observable();
    this.BPM = ko.observable();
    this.rating = ko.observable();
    this.relevance = ko.observable();
    this.ups = ko.observable();
    this.downs = ko.observable();
    this.bit_rate = ko.observable();
    this.sample_rate = ko.observable();
    this.duration = ko.observable();
    this.post = ko.observable();
    this.title = ko.observable();
    this.album = ko.observable();
    this.artist = ko.observable();
    this.composer = ko.observable();
    this.conductor = ko.observable();
    this.copyright = ko.observable();
    this.genre = ko.observable();
    this.ISRC = ko.observable();
    this.language = ko.observable();
    this.key = ko.observable();
    this.energy = ko.observable();
    this.name = ko.observable();

    // calculated description
    this.description = ko.computed(function() {
        var data = [];
        data.push('<strong>id</strong> ' + this.id());
        data.push('<strong>found_on</strong> ' + this.found_on());
        data.push('<strong>modified_on</strong> ' + this.modified_on());
        data.push('<strong>last_played</strong> ' + this.last_played());
        data.push('<strong>last_scheduled</strong> ' + this.last_scheduled());
        data.push('<strong>date</strong> ' + this.date());
        data.push('<strong>BPM</strong> ' + this.BPM());
        data.push('<strong>rating</strong> ' + this.rating());
        data.push('<strong>relevance</strong> ' + this.relevance());
        data.push('<strong>ups</strong> ' + this.ups());
        data.push('<strong>downs</strong> ' + this.downs());
        data.push('<strong>bit_rate</strong> ' + this.bit_rate());
        data.push('<strong>sample_rate</strong> ' + this.sample_rate());
        data.push('<strong>duration</strong> ' + this.duration());
        data.push('<strong>post</strong> ' + this.post());
        data.push('<strong>title</strong> ' + this.title());
        data.push('<strong>album</strong> ' + this.album());
        data.push('<strong>artist</strong> ' + this.artist());
        data.push('<strong>composer</strong> ' + this.composer());
        data.push('<strong>conductor</strong> ' + this.conductor());
        data.push('<strong>copyright</strong> ' + this.copyright());
        data.push('<strong>genre</strong> ' + this.genre());
        data.push('<strong>ISRC</strong> ' + this.ISRC());
        data.push('<strong>language</strong> ' + this.language());
        data.push('<strong>key</strong> ' + this.key());
        data.push('<strong>energy</strong> ' + this.energy());
        data.push('<strong>name</strong> ' + this.name());
        return data.join('<br />');
    }, this);

    // select file
    this.select = function() {
        this.selected(!this.selected());
    }.bind(this);

    // show info modal
    this.show_info = function() {

        // reset modal
        modal.reset();
        // set up modal
        modal.title(this.artist() + ' - ' + this.title())
        modal.text(this.description());
        modal.type('html');
        modal.ok = modal.hide;
        // show modal
        modal.show();

    }.bind(this);

    // mapping
    ko.mapping.fromJS(file, {}, this);

};

// file property
function file_property_model(file_property) {

    // members
    this.active = ko.observable(false);
    this.name = ko.observable();
    this.type = ko.observable();
    this.value = ko.observable();
    this.order = ko.observable();

    // clear
    this.clear = function() {
        this.active(false);
        this.value(null);
    }.bind(this);

    // human name computed
    this.human_name = ko.computed(function() {
        return Helper.human_name(this.name());
    }.bind(this));

    // value change activation subscription
    this.value.subscribe(function(value) {
        this.active(value != null);
    }.bind(this));

    // mapping
    ko.mapping.fromJS(file_property, {
        'include': ['name', 'value']
    }, this);

};

// file setter
function file_setter_model() {

    // members
    this.file_properties = ko.observableArray();

    // clear all file properties
    this.clear_all = function() {
        ko.utils.arrayForEach(this.file_properties(), function(file_property) {
            file_property.clear();
        });
    }.bind(this);

    // initialize
    this.initialize = function() {
        var order = 0;
        // initialize
        this.file_properties.push(new file_property_model({ name: 'artist', order: order++ }));
        this.file_properties.push(new file_property_model({ name: 'title', order: order++ }));
        this.file_properties.push(new file_property_model({ name: 'available', type: 'bool', order: order++ }));
        this.file_properties.push(new file_property_model({ name: 'relevance', type: 'five', order: order++ }));
        this.file_properties.push(new file_property_model({ name: 'rating', type: 'five', order: order++ }));
        this.file_properties.push(new file_property_model({ name: 'album', order: order++ }));
        this.file_properties.push(new file_property_model({ name: 'genre', order: order++ }));
        this.file_properties.push(new file_property_model({ name: 'BPM', order: order++ }));
        this.file_properties.push(new file_property_model({ name: 'key', order: order++ }));
        this.file_properties.push(new file_property_model({ name: 'energy', type: 'ten', order: order++ }));
        this.file_properties.push(new file_property_model({ name: 'ups', order: order++ }));
        this.file_properties.push(new file_property_model({ name: 'downs', order: order++ }));
        this.file_properties.push(new file_property_model({ name: 'post', type: 'duration', order: order++ }));
        this.file_properties.push(new file_property_model({ name: 'date', type: 'datetime', order: order++ }));
        this.file_properties.push(new file_property_model({ name: 'ISRC', order: order++ }));
        this.file_properties.push(new file_property_model({ name: 'composer', order: order++ }));
        this.file_properties.push(new file_property_model({ name: 'conductor', order: order++ }));
        this.file_properties.push(new file_property_model({ name: 'copyright', order: order++ }));
        this.file_properties.push(new file_property_model({ name: 'language', order: order++ }));
    }.bind(this);

    // initialize
    this.initialize();

};

// file viewer
function file_viewer_model() {

    // members
    this.files = ko.observableArray();

    // subscribe to query
    this.subscribe = function(query) {
        query.subscribe(function(query) {
            this.query(query);
        }.bind(this));
    }.bind(this);

    // query
    this.query = function(query) {
        $.get('/files/search.json', { query: query, restrict: true, randomize: true }, function (data) {
            // clear existing data
            this.files.removeAll();
            // check for no data
            if (!data) return;
            // add files
            ko.utils.arrayForEach(data, function(file) {
                this.files.push(new file_model(file));
            }.bind(this));
        }.bind(this));
    }.bind(this);

};

// files
function files_index_model() {

    // members
    this.query = ko.observable();
    this.files = ko.observableArray();
    this.sidebar = ko.observable();
    this.scanning = ko.observable(false);
    this.setting = ko.observable(false);
    this.file_setter = new file_setter_model();

    // selected filed count
    this.selected_files_count = ko.computed(function() {
        var count = 0;
        ko.utils.arrayForEach(this.files(), function(file) {
            if (file.selected()) { count++ };
        }.bind(this));
        return count;
    }.bind(this));

    this.refresh = function(query) {
        $.get('/files/search.json', { query: query ? query : this.query(), restrict: false, randomize: false }, function (files) {
            // clear existing data
            this.files.removeAll();
            // check for no files
            if (!files) return;
            // add files
            ko.utils.arrayForEach(files, function(file) {
                this.files.push(new file_model(file));
            }.bind(this));
        }.bind(this));
    }.bind(this)

    // clear data
    this.clear = function() {
        this.query('');
    }.bind(this);

    // select all
    this.select_all = function() {
        // if we have no selected files, select them all
        var none_selected = (this.selected_files_count() == 0);
        ko.utils.arrayForEach(this.files(), function(file) {
            file.selected(none_selected);
        }.bind(this));
    }.bind(this);

    // deactivate
    this.deactivate = function() {
        $.post('/files/deactivate.rawxml', { 'ids': this.get_selected_file_ids() }, function () {
            // get all of the selected ids
            ko.utils.arrayForEach(this.files(), function(file) {
                if (file.selected()) file.available('0');
            }.bind(this));
        }.bind(this));
    }.bind(this);

    // activate
    this.activate = function() {
        $.post('/files/activate.rawxml', { 'ids': this.get_selected_file_ids() }, function () {
            ko.utils.arrayForEach(this.files(), function(file) {
                if (file.selected()) file.available('1');
            }.bind(this));
        }.bind(this));
    }.bind(this);

    // select all
    this.toggle_set_mode = function(set_mode) {
        if (this.set_mode() == set_mode)
            this.set_mode(null);
        else
            this.set_mode(set_mode);
    }.bind(this);

    // set properties
    this.set_properties = function() {

        // verify not already setting
        if (this.setting()) return;
        // set setting
        this.setting(true);

        var selected_file_ids = [];
        var selected_files = [];
        // get all selected file ids
        ko.utils.arrayForEach(this.files(), function(file) {
            if (!file.selected()) return;
            selected_file_ids.push(file.id());
            selected_files.push(file);
        });

        var active_file_properties = [];
        // get active file properties
        ko.utils.arrayForEach(this.file_setter.file_properties(), function(file_property) {
            if (!file_property.active()) return;
            active_file_properties.push(file_property);
        });

        // set properties
        $.post('/files/set_properties.rawxml', ko.mapping.toJSON({
            'ids': selected_file_ids,
            'properties': active_file_properties
        }), function () {

            // update UI properties for each selected file
            ko.utils.arrayForEach(selected_files, function(selected_file) {
                ko.utils.arrayForEach(active_file_properties, function(active_file_property) {
                    selected_file[active_file_property.name()](active_file_property.value());
                });
            }.bind(this));
            // no longer saving
            this.setting(false);

        }.bind(this)).fail(function() {
            // no longer saving
            this.setting(false);
        }.bind(this));

    }.bind(this);

    // scan files
    this.scan = function() {

        // verify not already scanning
        if (this.scanning()) return;
        // set scanning
        this.scanning(true);

        // set properties
        $.get('/files/scan.rawxml', function () {
            // refresh files
            this.refresh();
            // no longer scanning
            this.scanning(false);
        }.bind(this)).fail(function() {
            // no longer saving
            this.scanning(false);
        }.bind(this));

    }.bind(this);

    // cancel file modifications
    this.cancel = function() {
        this.refresh();
    }.bind(this);

    // file finder query subscription
    this.query.subscribe(this.refresh);
    // initial query
    this.query('');

};



/////////////////////
// SCHEDULE MODELS //
/////////////////////

// schedule date model
function schedule_date_model(schedule_date) {
    ko.mapping.fromJS(schedule_date, {
        'schedules': { create: function(options) { return new schedule_model(options.data); } }
    }, this);
};

// schedule file
function schedule_file_model(schedule_file_js) {

    // members
    this.id = ko.observable();
    this.played_on = ko.observable(null);
    this.queued_on = ko.observable(null);
    this.skipped_on = ko.observable(null);
    this.file = ko.observable();
    this.focused = ko.observable(false);
    this.selected = ko.observable(false);

    // static (cannot be moved) computed
    this.static = ko.computed(function() {
        return this.played_on() || this.queued_on() || this.skipped_on();
    }.bind(this));

    // select
    this.select = function() {
        this.selected(!this.selected());
    }.bind(this);

    // color
    this.color = ko.computed(function() {

        // skipped
        if (this.skipped_on())
            return 'danger';
        // played
        if (this.played_on())
            return 'success';
        // queued
        if (this.queued_on())
            return 'warning';
        // promo
        if (this.file() &&
            ((this.file().genre() == 'Bumper')
            || (this.file().genre() == 'Sweeper')
            || (this.file().genre() == 'Intro')
            || (this.file().genre() == 'Ad')))
            return 'muted';
        // none
        return '';

    }.bind(this));

    // map
    ko.mapping.fromJS(schedule_file_js, null, this);

};

// schedules index
function schedules_index_model() {

    // members
    this.schedule_dates = ko.observableArray();
    this.editing_schedule = ko.observable();
    this.file_finder = new file_finder_model();
    this.auto_refresh = ko.observable(false);
    this.auto_focus = ko.observable(true);
    this.generating = ko.observable(false);
    this.sidebar = ko.observable();
    this.saving = ko.observable(false);
    var original_editing_schedule_files;
    var original_auto_refresh;
    var refresh_interval;
    var focusing = false;

    // file
    this.file = function() {
        this.filing(!this.filing());
    };

    // selected schedule files count
    this.selected_schedules_count = ko.computed(function() {
        var count = 0;
        ko.utils.arrayForEach(this.schedule_dates(), function(schedule_date) {
            ko.utils.arrayForEach(schedule_date.schedules(), function(schedule) {
                if (schedule.selected()) { count++; }
            }.bind(this));
        }.bind(this));
        return count;
    }.bind(this));

    // create schedule file from file
    this.create_schedule_file = function(file) {
        var schedule_file = new schedule_file_model();
        schedule_file.file(file);
        return schedule_file;
    };

    // add all files
    this.add_all_files = function() {

        // get currently editing schedule
        var current_editing_schedule = this.editing_schedule();
        // verify we have a schedule under edit
        if (!current_editing_schedule)
            return;

        var insertion_schedule_files_index = 0;
        // first find the first selected item in our list
        $.each(current_editing_schedule.schedule_files(), function(schedule_file_index, schedule_file) {
            if (schedule_file.selected()) insertion_schedule_files_index = schedule_file_index;
        });
        // if there are no schedule files, add to end
        if (insertion_schedule_files_index == 0)
            insertion_schedule_files_index = current_editing_schedule.schedule_files().length;

        var schedule_files = [];
        // add each selected file as a schedule file at the next index
        ko.utils.arrayForEach(this.file_finder.files(), function(file) {
            // setup file
            var schedule_file = this.create_schedule_file(file);
            // insert file at insertion index
            current_editing_schedule.schedule_files.splice(insertion_schedule_files_index, 0, schedule_file);
            insertion_schedule_files_index++;
        }.bind(this));

    };

    // cancel edit schedule
    this.cancel_edit_schedule = function() {

        // get currently editing schedule
        var current_editing_schedule = this.editing_schedule();
        // verify we have one
        if (!current_editing_schedule)
            return;

        // repopulate the original schedule files
        current_editing_schedule.schedule_files(original_editing_schedule_files);
        // cancel editing
        current_editing_schedule.editing(false);
        // set editing null
        this.editing_schedule(null);
        // set auto-refresh back to original state
        if (original_auto_refresh)
            this.auto_refresh(true);

    };

    // edit schedule
    this.edit_schedule = function(schedule) {

        // cancel any existing edit schedule
        this.cancel_edit_schedule();
        // we are about to edit, deselect all schedules (avoid confusion)
        ko.utils.arrayForEach(this.schedule_dates(), function(schedule_date) {
            ko.utils.arrayForEach(schedule_date.schedules(), function(schedule) {
                if (schedule.selected()) schedule.selected(false);
            }.bind(this));
        }.bind(this));

        // save auto-refresh status
        original_auto_refresh = this.auto_refresh();
        // set auto-refresh off
        if (original_auto_refresh)
            this.auto_refresh(false);

        // backup schedule files
        original_editing_schedule_files = schedule.schedule_files().slice();
        // switch editing to this requested schedule
        this.editing_schedule(schedule);
        // make sure the schedule is expanded & editing
        schedule.expanded(true);
        schedule.editing(true);

    }.bind(this);

    // save
    this.save_schedule = function() {

        // get currently editing schedule
        var current_editing_schedule = this.editing_schedule();

        var file_ids = [];
        // get DTO for schedule file changes
        ko.utils.arrayForEach(current_editing_schedule.schedule_files(), function(schedule_file) {
            file_ids.push(schedule_file.file().id());
        });

        // post DTO for saving
        $.post('schedules/save.rawxml', { 'id': current_editing_schedule.id(), 'file_ids': file_ids }, function(response) {

            var message;
            // verify response
            switch (response) {
                case 'SCHEDULE_NOT_FOUND':
                    message = 'Schedule not found. Please refresh page and try again.';
                    break;
                case 'SCHEDULE_OUT_OF_SYNC':
                    message = 'Schedule out of sync. Please refresh page and try again.';
                    break;
            }

            // if message, show
            if (message) {
                $('#cloudcast-modal-error .modal-body').html(message);
                $('#cloudcast-modal-delete').modal('show');
            }

            // turn off editing
            this.editing_schedule(null);
            current_editing_schedule.editing(false);

        }.bind(this));

    }.bind(this);

    // focus schedule under edit
    this.focus_editing_schedule = function() {
        this.editing_schedule().focused(true);
    }.bind(this);

    // select all schedules
    this.select_all = function() {
        // if we have no selected schedules, select them all
        var none_selected = (this.selected_schedules_count() == 0);
        ko.utils.arrayForEach(this.schedule_dates(), function(schedule_date) {
            ko.utils.arrayForEach(schedule_date.schedules(), function(schedule) {
                schedule.selected(none_selected);
            }.bind(this));
        }.bind(this));
    }.bind(this);

    // deactivate schedules
    this.deactivate = function() {

        var selected_schedule_ids = [];
        var selected_schedules = [];
        // get all selected schedule ids
        ko.utils.arrayForEach(this.schedule_dates(), function(schedule_date) {
            ko.utils.arrayForEach(schedule_date.schedules(), function(schedule) {
                if (schedule.selected()) {
                    selected_schedule_ids.push(schedule.id());
                    selected_schedules.push({
                        'schedule_date': schedule_date,
                        'schedule': schedule
                    });
                }
            }.bind(this));
        }.bind(this));

        // post deactivated ids
        $.post('/schedules/deactivate.rawxml', { 'ids': selected_schedule_ids }, function () {

            var obsolete_schedule_dates = [];
            // loop over all selected schedule arrays
            ko.utils.arrayForEach(selected_schedules, function(selected_schedule) {
                // remove selected schedules from the current array
                selected_schedule.schedule_date.schedules.remove(selected_schedule.schedule);
                // if we have no more schedules, delete this date
                if (selected_schedule.schedule_date.schedules().length == 0)
                    obsolete_schedule_dates.push(selected_schedule.schedule_date);
            });

            // remove obsolete schedule dates (all schedules removed)
            this.schedule_dates.removeAll(obsolete_schedule_dates);

        }.bind(this));
    }.bind(this);

    this.toggle_auto_refresh = function() {
        // flip auto-refresh
        this.auto_refresh(!this.auto_refresh());
    }.bind(this);

    this.auto_refresh.subscribe(function(value) {
        // if refresh enabled
        if (!value) {
            // clear interval
            clearInterval(refresh_interval);
        } else {
            // refresh at interval
            refresh_interval = setInterval(function() {
                this.refresh();
            }.bind(this), 5000);
        }
    }.bind(this));

    this.toggle_auto_focus = function() {
        this.auto_focus(!this.auto_focus());
    }.bind(this);

    this.refresh = function() {
        // post request for schedule dates
        $.post('/schedules/dates.json', function (schedule_dates) {
            // verify we are not editing as this call can take some time
            if (!schedule_dates || this.editing_schedule())
                return;

            var selected_schedule_ids = [];
            var expanded_schedule_ids = [];
            // remember all of the currently selected and expanded schedules
            ko.utils.arrayForEach(this.schedule_dates(), function(schedule_date) {
                ko.utils.arrayForEach(schedule_date.schedules(), function(schedule) {
                    if (schedule.selected()) selected_schedule_ids.push(schedule.id());
                    if (schedule.expanded()) expanded_schedule_ids.push(schedule.id());
                });
            });

            // update schedule dates array
            ko.mapping.fromJS(schedule_dates, {
                create: function(options) {
                    var schedule_date = new schedule_date_model(options.data, this);
                    ko.utils.arrayForEach(schedule_date.schedules(), function(schedule) {
                        if (selected_schedule_ids.indexOf(schedule.id()) >= 0) schedule.selected(true);
                        if (expanded_schedule_ids.indexOf(schedule.id()) >= 0) schedule.expanded(true);
                    });
                    return schedule_date;
                }.bind(this)
            }, this.schedule_dates);

            // auto-focus
            if (this.auto_focus())
                this.focus();

        }.bind(this));
    };

    // expand top schedule and focus queued
    this.focus = function() {

        // first make sure we have schedules
        if (!this.schedule_dates() || (this.schedule_dates().length == 0))
            return;

        // get first schedule
        var first_schedule = this.schedule_dates()[0].schedules()[0];

        var queued_schedule_files = [];
        // get first schedule file
        ko.utils.arrayForEach(first_schedule.schedule_files(), function(schedule_file) {
            if (schedule_file.queued_on()) queued_schedule_files.push(schedule_file);
        });
        // if we didn't find one, we are done
        if (queued_schedule_files.length == 0)
            return;

        // get the third last
        var third_last_queued_schedule_files = queued_schedule_files.slice(-4)[0];
        // ensure expansion & focus
        first_schedule.expanded(true);
        focusing = true;
        third_last_queued_schedule_files.focused(true);
        setTimeout(function() { focusing = false; }, 0);

    }.bind(this);

    // user scrolled
    this.scrolled = function(e) {

        if (focusing) return;
        // else, disable auto-focus
        this.auto_focus(false);

    }.bind(this);

    // generate
    this.generate = function() {

        // ignore if already generating
        if (this.generating()) return;
        // set generating
        this.generating(true);
        // generate schedules
        $.get('/schedules/generate.rawxml', function() {
            this.generating(false);
        }.bind(this)).fail(function() {
            this.generating(false);
        }.bind(this));

    }.bind(this);

    // run initial query
    this.file_finder.clear();
    // enable auto-refresh
    this.auto_refresh(true);
    // load initial dates
    this.refresh();

};

// schedule
function schedule_model(schedule) {

    // members
    this.schedule_files = ko.observableArray();
    this.editing = ko.observable(false);
    this.selected = ko.observable(false);
    this.focused = ko.observable(false);
    this.expanded = ko.observable(false);

    // selected schedule files count
    this.selected_schedule_files_count = ko.computed(function() {
        var count = 0;
        ko.utils.arrayForEach(this.schedule_files(), function(schedule_file) {
            if (schedule_file.selected()) { count++; }
        }.bind(this));
        return count;
    }.bind(this));

    // duration amongst all files
    this.total_duration = ko.computed(function() {
        var total_hours = 0;
        var total_minutes = 0;
        var total_seconds = 0;
        // get total duration
        ko.utils.arrayForEach(this.schedule_files(), function(schedule_file) {
            // get file duration
            var schedule_file_duration = schedule_file.file().duration();
            // calculate totals
            var duration_parts = schedule_file_duration.split(':');
            if (duration_parts.length == 3) {
                total_hours += parseInt(duration_parts[0]);
                total_minutes += parseInt(duration_parts[1]);
                total_seconds += parseInt(duration_parts[2]);
            } else {
                total_minutes += parseInt(duration_parts[0]);
                total_seconds += parseInt(duration_parts[1]);
            }
        });
        // normalize total
        return Helper.calculate_duration(total_hours, total_minutes, total_seconds);
    }.bind(this));

    // editing subscription
    this.editing.subscribe(function(value) {
        if (value) return;
        // deselect everything if we are cancelling edit
        ko.utils.arrayForEach(this.schedule_files(), function(schedule_file) {
            if (schedule_file.selected()) schedule_file.selected(false);
        }.bind(this));
    }.bind(this));

    // select all schedule files
    this.select_all = function() {
        // if we have no selected schedule files, select them all
        var none_selected = (this.selected_schedule_files_count() == 0);
        ko.utils.arrayForEach(this.schedule_files(), function(schedule_file) {
            // verify schedule file not static (queued, played, skipped)
            if (schedule_file.static()) return;
            schedule_file.selected(none_selected);
        }.bind(this));
    }.bind(this);

    // remove files
    this.remove = function() {
        var selected_schedule_files = [];
        ko.utils.arrayForEach(this.schedule_files(), function(schedule_file) {
            if (!schedule_file.selected()) return;
            selected_schedule_files.push(schedule_file);
        }.bind(this));
        // remove all selected schedule files
        this.schedule_files.removeAll(selected_schedule_files);
    }.bind(this);

    // expand/collapse
    this.expand_collapse = function() {
        this.expanded(!this.expanded());
    }.bind(this);

    // select
    this.select = function() {
        this.selected(!this.selected());
    }.bind(this);

    // mapping
    ko.mapping.fromJS(schedule, {
        'schedule_files': { create: function(options) { return new schedule_file_model(options.data); } }
    }, this);

};

////////////////////
// SETTING MODELS //
////////////////////

// setting category model
function setting_category_model(setting_category) {

    // members
    this.name = ko.observable();
    this.settings = ko.observableArray();

    // human name
    this.human_name = ko.computed(function() {
        return Helper.human_name(this.name());
    }.bind(this));

    // mapping
    ko.mapping.fromJS(setting_category, {
        'settings': { create: function(options) { return new setting_model(options.data); } }
    }, this);

};

// setting model
function setting_model(setting) {

    // members
    this.name = ko.observable();

    // human name
    this.human_name = ko.computed(function() {
        return Helper.human_name(this.name());
    }.bind(this));

    // mapping
    ko.mapping.fromJS(setting, {}, this);

};

// settings index model
function settings_index_model() {

    // members
    this.categories = ko.observableArray();
    this.saving = ko.observable(false);

    // save
    this.save = function() {

        // verify not already saving
        if (this.saving()) return;
        // set saving
        this.saving(true);

        var settings = [];
        // gather all settings into one array
        ko.utils.arrayForEach(this.categories(), function (category) {
            settings = settings.concat(category.settings());
        });

        // save all settings
        $.post('/settings/save.rawxml', ko.mapping.toJSON(settings), function (data, status, request) {
            this.saving(false);
        }.bind(this)).fail(function() {
            this.saving(false);
        }.bind(this));

    }.bind(this);

    // refresh
    this.refresh = function() {

        // get blocks
        $.get('/settings/categories.json', function (categories) {
            if (!categories) return;
            ko.utils.arrayForEach(categories, function(category) {
                this.categories.push(new setting_category_model(category));
            }.bind(this));
        }.bind(this));

    };

    // initialize
    this.refresh();

};

/////////////////
// SHOW MODELS //
/////////////////

function show_day_model(show_day) {
    ko.mapping.fromJS(show_day, {
        'shows': {
            create: function(options) {
                var show = new show_model(options.data);
                show.show_full_date(false);
                return show;
            }
        }
    }, this);
};

// show form
function show_form_model() {

    // members
    this.show = ko.observable();
    this.errors = ko.observable();
    this.saving = ko.observable(false);

    // input names
    this.input_names = ko.observableArray([
        'talkover',
        'show',
        'master'
    ]);

    // username typeaheads
    this.query_users = function(query, process) {
        return $.get('/users/search.json', { query: query }, function(data) {
            if (data) return process(data);
        });
    };

    // block typeaheads
    this.query_blocks = function(query, process) {
        return $.get('/blocks/search.json', { query: query }, function (data) {
            if (data) return process(data);
        });
    };

    // refresh
    this.refresh = function() {
        // get show from url
        $.post(document.URL + '.json', function (show) {
            if (!show) return;
            this.show(new show_model(show));
        }.bind(this));
    }.bind(this);

    // save
    this.save = function() {
        // verify not already saving
        if (this.saving()) return;
        // set saving
        this.saving(true);
        // save show
        $.post(document.URL + '.json', ko.mapping.toJSON(this.show()), function (data, status, request) {
            // check for validation errors
            if (request.getResponseHeader('errors')) {
                this.errors(data);
                this.saving(false);
            } else {
                // redirect to shows
                window.location = '/shows';
            }
        }.bind(this)).fail(function() {
            this.saving(false);
            }.bind(this));
    }.bind(this);

    // cancel
    this.cancel = function() {
        window.location = '/shows';
    };

    // initialize
    this.refresh();

};

// shows index model
function shows_index_model() {

    // members
    this.single_shows = ko.observableArray();
    this.repeat_days = ko.observableArray();

    // create
    this.create = function() {
        window.location = '/shows/create';
    }.bind(this);

    // selected single shows count
    this.selected_single_shows_count = ko.computed(function() {
        var count = 0;
        // get selected single shows
        ko.utils.arrayForEach(this.single_shows(), function(show) {
            if (show.selected()) { count++; }
        }.bind(this));
        return count;
    }.bind(this));

    // selected repeat shows count
    this.selected_repeat_shows_count = ko.computed(function() {
        var count = 0;
        // get selected repeat shows
        ko.utils.arrayForEach(this.repeat_days(), function(repeat_day) {
            ko.utils.arrayForEach(repeat_day.shows(), function(show) {
                if (show.selected()) { count++; }
            }.bind(this));
        }.bind(this));
        return count;
    }.bind(this));

    // select all single shows
    this.select_all_single = function() {
        // if we have no selected single shows, select them all
        var none_selected = (this.selected_single_shows_count() == 0);
        // select all single shows
        ko.utils.arrayForEach(this.single_shows(), function(show) {
            show.selected(none_selected);
        }.bind(this));
    }.bind(this);

    // select all repeat shows
    this.select_all_repeat = function() {
        // if we have no selected repeat shows, select them all
        var none_selected = (this.selected_repeat_shows_count() == 0);
        // select all repeat shows
        ko.utils.arrayForEach(this.repeat_days(), function(repeat_day) {
            ko.utils.arrayForEach(repeat_day.shows(), function(show) {
                show.selected(none_selected);
            }.bind(this));
        }.bind(this));
    }.bind(this);

    // deactivate shows
    this.deactivate = function() {

        var selected_show_ids = [];
        var selected_single_shows = [];
        // get selected single shows
        ko.utils.arrayForEach(this.single_shows(), function(show) {
            if (show.selected()) {
                selected_show_ids.push(show.id());
                selected_single_shows.push(show);
            }
        }.bind(this));

        var selected_repeat_shows = [];
        // get selected repeat show ids
        ko.utils.arrayForEach(this.repeat_days(), function(repeat_day) {
            ko.utils.arrayForEach(repeat_day.shows(), function(show) {
                if (show.selected()) {
                    selected_show_ids.push(show.id());
                    selected_repeat_shows.push({
                        'array': repeat_day.shows,
                        'show': show
                    });
                }
            }.bind(this));
        }.bind(this));

        // deactivate selected shows & refresh
        $.post('/shows/deactivate.rawxml', { 'ids': selected_show_ids }, function () {

            // remove single shows
            this.single_shows.removeAll(selected_single_shows);
            // loop over all selected repeat show arrays
            ko.utils.arrayForEach(selected_repeat_shows, function(selected_repeat_show) {
                // remove selected show from the current array
                selected_repeat_show.array.remove(selected_repeat_show.show);
            });

        }.bind(this));

    }.bind(this);

    // refresh
    this.refresh = function() {

        // get single shows
        $.get('/shows/singles.json', function (singles_shows) {
            if (!singles_shows) return;
            ko.utils.arrayForEach(singles_shows, function(singles_show) {
                this.single_shows.push(new show_model(singles_show));
            }.bind(this));
        }.bind(this));
        // get repeat shows days
        $.get('/shows/repeat_days.json', function (repeat_days) {
            if (!repeat_days) return;
            ko.utils.arrayForEach(repeat_days, function(repeat_day) {
                this.repeat_days.push(new show_day_model(repeat_day));
            }.bind(this));
        }.bind(this));

    };

    // initialize
    this.refresh();

};

// show
function show_model(show) {

    // members
    this.id = ko.observable();
    this.title = ko.observable();
    this.description = ko.observable();
    this.user_start_on = ko.observable();
    this.user_start_on_timeday = ko.observable();
    this.user_start_on_time = ko.observable();
    this.user_end_at = ko.observable();
    this.user_end_at_timeday = ko.observable();
    this.user_end_at_time = ko.observable();
    this.duration = ko.observable();
    this.title = ko.observable();
    this.blocked = ko.observable();
    this.repeated = ko.observable();
    this.hosted = ko.observable();
    this.block = ko.observable();
    this.repeat = ko.observable();
    this.show_repeat = ko.observable();
    this.sweepers = ko.observable();
    this.jingles = ko.observable();
    this.bumpers = ko.observable();
    this.intros = ko.observable();
    this.closers = ko.observable();
    this.sweepers_album = ko.observable();
    this.sweeper_interval = ko.observable();
    this.jingles_album = ko.observable();
    this.bumpers_album = ko.observable();
    this.intros_album = ko.observable();
    this.closers_album = ko.observable();
    this.show_users = ko.observableArray();
    this.show_full_date = ko.observable(true);
    this.selected = ko.observable(false);

    // edit
    this.edit = function(data, e) {
        window.location = '/shows/edit/' + this.id();
        e.stopPropagation();
    }.bind(this);

    // edit block
    this.edit_block = function(data, e) {
        window.location = '/blocks/edit/' + this.block().id();
        e.stopPropagation();
    }.bind(this);

    // edit layout
    this.layout_block = function(data, e) {
        window.location = '/blocks/layout/' + this.block().id();
        e.stopPropagation();
    }.bind(this);

    // select
    this.select = function() {
        this.selected(!this.selected());
    }.bind(this);

    // add show user
    this.add_show_user = function() {
        this.show_users.push(new show_user_model({ 'user': {} }));
    }.bind(this);

    // remove show user
    this.remove_show_user = function(show_user) {
        this.show_users.remove(show_user)
    }.bind(this);

    // calc duration from start/end
    this.calculate_duration = function(start_on, end_at) {
        // get start on/end on
        var start_on_date = Helper.date(start_on);
        var end_at_date = Helper.date(end_at);
        // calculate duration
        var duration = Helper.duration(start_on_date, end_at_date);
        // validate duration
        if (duration)
            return duration;
        else
            return '00:00:00';
    };

    // start on subscription
    this.user_start_on.subscribe(function(value) {
        if (!this.user_end_at() || (this.user_end_at() == ''))
            this.user_end_at(this.user_start_on());
        else
            this.duration(this.calculate_duration(value, this.user_end_at()))
    }.bind(this));

    // end at subscription
    this.user_end_at.subscribe(function(value) {
        this.duration(this.calculate_duration(this.user_start_on(), value))
    }.bind(this));

    // mapping
    ko.mapping.fromJS(show, {
        'include': [
            'title',
            'description',
            'user_start_on',
            'duration',
            'block',
            'show_repeat',
            'show_users',
            'sweepers_album',
            'sweeper_interval',
            'jingles_album',
            'bumpers_album',
            'intros_album',
            'closers_album',
        ],
        'show_users': {
            create: function(options) {
                return new show_user_model(options.data);
            }.bind(this)
        },
        'show_repeat': { create: function(options) { return new show_repeat_model(show.show_repeat); } },
        'block': { create: function(options) { return new block_model(show.block); } }
    }, this);

    // initialize flags
    this.sweepers(this.sweepers_album() ? true : false);
    this.jingles(this.jingles_album() ? true : false);
    this.bumpers(this.bumpers_album() ? true : false);
    this.intros(this.intros_album() ? true : false);
    this.closers(this.closers_album() ? true : false);
    this.repeated(this.show_repeat() ? true : false);
    this.blocked(this.block() ? true : false);
    this.hosted(show.hosted || (this.show_users().length > 0 ? true : false));

    // initialize user end at
    if (this.user_start_on())
        this.user_end_at(Helper.datetime_add_duration(this.user_start_on(), this.duration()));

    // blocked subscription
    this.blocked.subscribe(function(value) {
        if (value) this.block(new block_model({}));
        else this.block(null);
    }.bind(this));

    // hosted subscription
    this.hosted.subscribe(function(value) {
        if (value) this.show_users.push(new show_user_model({ 'user': {} }));
        else this.show_users.removeAll();
    }.bind(this));

    // repeated subscription
    this.repeated.subscribe(function(value) {
        if (value) this.show_repeat(new show_repeat_model({}));
        else this.show_repeat(null);
    }.bind(this));

    // sweepers subscription
    this.sweepers.subscribe(function(value) {
        if (!value) {
            this.sweepers_album(null);
            this.sweeper_interval(null);
        }
    }.bind(this));

    // jingles subscription
    this.jingles.subscribe(function(value) {
        if (!value) this.jingles_album(null);
    }.bind(this));

    // bumpers subscription
    this.bumpers.subscribe(function(value) {
        if (!value) this.bumpers_album(null);
    }.bind(this));

    // intros subscription
    this.intros.subscribe(function(value) {
        if (!value) this.intros_album(null);
    }.bind(this));

    // closers subscription
    this.closers.subscribe(function(value) {
        if (!value) this.closers_album(null);
    }.bind(this));

};

// show repeat model
function show_repeat_model(show_repeat) {

    // members
    this.Sunday = ko.observable();
    this.Monday = ko.observable();
    this.Tuesday = ko.observable();
    this.Wednesday = ko.observable();
    this.Thursday = ko.observable();
    this.Friday = ko.observable();
    this.Saturday = ko.observable();
    this.ends = ko.observable();
    this.user_end_on = ko.observable();

    // mapping
    ko.mapping.fromJS(show_repeat, {
        'include': ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'user_end_on'],
        'ignore': ['id']
    }, this);

    // initialize flags
    this.ends(this.user_end_on() ? true : false);

    // ends subscription
    this.ends.subscribe(function(value) {
        if (!value) this.user_end_on(null);
        else this.user_end_on('');
    }.bind(this));

};

// show user model
function show_user_model(show_user) {

    // members
    this.show = ko.observable();
    this.user = ko.observable();
    this.input_name = ko.observable();

    // mapping
    ko.mapping.fromJS(show_user, {
        'include': ['input_name'],
        'show': { create: function(options) { return new show_model(show_user.show); } },
        'user': { create: function(options) { return new user_model(show_user.user); } }
    }, this);

};

///////////////////
// STATUS MODELS //
///////////////////

// status
function status_model(status_js) {

    // standard members
    this.current_file_id = ko.observable();
    this.current_file_artist = ko.observable();
    this.current_file_title = ko.observable();
    this.current_file_duration = ko.observable();
    this.current_file_post = ko.observable();
    this.next_file_artist = ko.observable();
    this.next_file_title = ko.observable();
    this.next_file_post = ko.observable();
    this.next_file_duration = ko.observable();
    this.current_show_title = ko.observable();
    this.current_show_duration = ko.observable();
    this.next_show_title = ko.observable();
    this.current_client_schedule_start_on = ko.observable();
    this.current_client_schedule_file_played_on = ko.observable();
    this.host_username = ko.observable();
    this.client_generated_on = ko.observable();
    // additional members
    this.current_file_percentage = ko.observable();
    this.current_show_percentage = ko.observable();
    this.current_file_post_percentage = ko.observable();
    this.current_file_elapsed = ko.observable();
    this.current_file_remaining = ko.observable();
    this.current_show_elapsed = ko.observable();
    this.current_show_remaining = ko.observable();
    this.updated_on_time = ko.observable();
    // input statuses
    this.schedule_input_active = ko.observable();
    this.show_input_active = ko.observable();
    this.talkover_input_active = ko.observable();
    this.master_input_active = ko.observable();
    // input enableds
    this.schedule_input_enabled = ko.observable();
    this.show_input_enabled = ko.observable();
    this.talkover_input_enabled = ko.observable();
    this.master_input_enabled = ko.observable();
    // input usernames
    this.show_input_username = ko.observable();
    this.talkover_input_username = ko.observable();
    this.master_input_username = ko.observable();

    // update
    this.update = function(status_js) {
        ko.mapping.fromJS(status_js, null, this);
    }.bind(this);

    // initialize
    this.update(status_js);

};

///////////////////
// STREAM MODELS //
///////////////////

// stream form
function stream_form_model() {

    // members
    this.stream = ko.observable();
    this.saving = ko.observable(false);
    this.errors = ko.observable();

    // refresh
    this.refresh = function() {
        // get stream from url
        $.post(document.URL + '.json', function (stream) {
            if (!stream) return;
            this.stream(new stream_model(stream));
        }.bind(this));
    }.bind(this);

    // save
    this.save = function() {
        // verify not already saving
        if (this.saving()) return;
        // set saving
        this.saving(true);
        // save stream
        $.post(document.URL + '.json', ko.mapping.toJSON(this.stream()), function (data, status, request) {
                // check for validation errors
                if (request.getResponseHeader('errors')) {
                    this.errors(data);
                    this.saving(false);
                } else {
                    // redirect to shows
                    window.location = '/streams';
                }
            }.bind(this)).fail(function() {
                this.saving(false);
            }.bind(this));
    }.bind(this);

    // cancel
    this.cancel = function() {
        window.location = '/streams';
    };

    // initialize
    this.refresh();

};

// streams index model
function streams_index_model() {

    // members
    this.streams = ko.observableArray();

    // selected streams count
    this.selected_streams_count = ko.computed(function() {
        var count = 0;
        // get selected blocks
        ko.utils.arrayForEach(this.streams(), function(stream) {
            if (stream.selected()) { count++; }
        }.bind(this));
        return count;
    }.bind(this));

    // select all streams
    this.select_all = function() {
        // if we have no selected streams, select them all
        var none_selected = (this.selected_streams_count() == 0);
        // select all blocks
        ko.utils.arrayForEach(this.streams(), function(stream) {
            stream.selected(none_selected);
        }.bind(this));
    }.bind(this);

    // create
    this.create = function() {
        window.location = '/streams/create';
    }.bind(this);

    // deactivate streams
    this.deactivate = function() {

        var selected_stream_ids = [];
        var selected_streams = [];
        // get selected blocks
        ko.utils.arrayForEach(this.streams(), function(stream) {
            if (stream.selected()) {
                selected_stream_ids.push(stream.id());
                selected_streams.push(stream);
            }
        }.bind(this));

        // delete selected streams & refresh
        $.post('/streams/deactivate.rawxml', { 'ids': selected_stream_ids }, function () {
            // remove selected streams
            this.streams.removeAll(selected_streams);
        }.bind(this));

    }.bind(this);

    // refresh
    this.refresh = function() {

        // get blocks
        $.get('/streams/displayable.json', function (streams) {
            if (!streams) return;
            ko.utils.arrayForEach(streams, function(stream) {
                this.streams.push(new stream_model(stream));
            }.bind(this));
        }.bind(this));

    };

    // initialize
    this.refresh();

};

// user model
function stream_model(stream) {

    // members
    this.id = ko.observable();
    this.name = ko.observable();
    this.type = ko.observable();
    this.port = ko.observable();
    this.host = ko.observable();
    this.format = ko.observable();
    this.source_username = ko.observable();
    this.source_password = ko.observable();
    this.admin_username = ko.observable();
    this.admin_password = ko.observable();
    this.mount = ko.observable();
    this.active = ko.observable();
    this.selected = ko.observable(false);

    // select
    this.select = function() {
        this.selected(!this.selected());
    }.bind(this);

    // edit
    this.edit = function(data, e) {
        window.location = '/streams/edit/' + this.id();
        e.stopPropagation();
    }.bind(this);

    // initialize
    ko.mapping.fromJS(stream, {
        'include': [
            'name',
            'type',
            'port',
            'host',
            'format',
            'source_username',
            'source_password',
            'admin_username',
            'admin_password',
            'mount'
        ]
    }, this);

};

/////////////////
// USER MODELS //
/////////////////

// user form
function user_form_model() {

    // user
    this.user = ko.observable();
    // set user
    this.user(new user_model(user_js));

};

// user model
function user_model(user) {

    // members
    this.username = ko.observable();
    this.old_password = ko.observable();
    this.password = ko.observable();
    this.group = ko.observable();
    this.email = ko.observable();
    this.first_name = ko.observable();
    this.last_name = ko.observable();
    this.phone = ko.observable();

    // mapping
    ko.mapping.fromJS(user, {
        'include': ['username']
    }, this);

};

// users index model
function users_index_model() {

    // members
    this.users = ko.observableArray(users_js);

    // delete user
    this.delete = function(user) {
        $('#cloudcast-modal-delete .modal-body').html('Are you sure you want to delete the user "' + user.username + '"?');
        $('#cloudcast-modal-delete button[name=delete]').off().click(function () { window.location.replace('/users/delete/' + user.username); });
        $('#cloudcast-modal-delete').modal('show');
    };

};

///////////
// HOOKS //
///////////

// blocks
function hook_blocks() {

    // index
    var blocks_index_element = document.getElementById('blocks-index');
    if (blocks_index_element)
        ko.applyBindings(new blocks_index_model(), blocks_index_element);

    // form
    var block_form_element = document.getElementById('block-form');
    if (block_form_element)
        ko.applyBindings(new block_form_model(), block_form_element);

    // layout
    var block_layout_element = document.getElementById('block-layout');
    if (block_layout_element)
        ko.applyBindings(new block_layout_model(), block_layout_element);

}

// files
function hook_files() {

    // index
    var file_index_element = document.getElementById('files-index');
    if (file_index_element)
        ko.applyBindings(new files_index_model(), file_index_element);

}

// schedules
function hook_schedules() {

    // index
    var schedules_index_element = document.getElementById('schedules-index');
    // verify this element in DOM
    if (!schedules_index_element)
        return;
    // create index model
    var the_schedules_index_model = new schedules_index_model();
    // bind index
    ko.applyBindings(the_schedules_index_model, schedules_index_element);
    // scroll event
    $(schedules_index_element).find('.cloudcast-section-content').scroll(the_schedules_index_model.scrolled);

}

// settings
function hook_settings() {

    // index
    var settings_index_element = document.getElementById('settings-index');
    if (settings_index_element)
        ko.applyBindings(new settings_index_model(), settings_index_element);

}

// shows
function hook_shows() {

    // index
    var shows_index_element = document.getElementById('shows-index');
    if (shows_index_element)
        ko.applyBindings(new shows_index_model(), shows_index_element);

    // form
    var show_form_element = document.getElementById('show-form');
    if (show_form_element)
        ko.applyBindings(new show_form_model(), show_form_element);

}

// streams
function hook_streams() {

    // index
    var streams_index_element = document.getElementById('streams-index');
    if (streams_index_element)
        ko.applyBindings(new streams_index_model(), streams_index_element);
    // form
    var stream_form_element = document.getElementById('stream-form');
    if (stream_form_element)
        ko.applyBindings(new stream_form_model(), stream_form_element);

}

// users
function hook_users() {

    // index
    var users_index_element = document.getElementById('users-index');
    if (users_index_element)
        ko.applyBindings(new users_index_model(), users_index_element);
    // form
    var user_form_element = document.getElementById('user-form');
    if (user_form_element)
        ko.applyBindings(new user_form_model(), user_form_element);

}

function hook_common() {

    // auto-close navbar on button press
    $('.navbar-collapse').on('click', 'button', function() {
        $(this).closest('.navbar-collapse').removeClass('in').addClass('collapse');
    });

    // status display
    ko.applyBindings(new cloudcast_display_model(), document.getElementById('cloudcast-display'));

}

///////////
// READY //
///////////

$(function() {

    hook_blocks();
    hook_files();
    hook_schedules();
    hook_settings();
    hook_shows();
    hook_streams();
    hook_users();
    hook_common();

});