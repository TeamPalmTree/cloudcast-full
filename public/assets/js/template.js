//////////////////
// BLOCK MODELS //
//////////////////

// block finder
var block_finder_model = function () {

    // members
    this.blocks = ko.observableArray();
    // set blocks
    ko.mapping.fromJS(blocks_js, null, this.blocks);

};

// block form
var block_form_model = function () {

    // members
    this.block = ko.observable();
    this.file_viewer = new file_viewer_model();
    // set block
    this.block(new block_model(block_js));
    // subscribe viewer to block query
    this.file_viewer.subscribe(this.block().file_query);
    // run initial query
    this.file_viewer.query(this.block().file_query());

};

// block layout item
var block_item_model = function (block_layout_model, block_item_js) {

    // members
    this.percentage = ko.observable();
    this.duration = ko.observable();
    this.file = ko.observable();
    this.child_block = ko.observable();

    // calculated title
    this.title = ko.computed(function() {
        if (this.file())
            return this.file().title();
        else if (this.child_block())
            return this.child_block().title();
    }, this);

    // calculated entered percentage
    this.checked_percentage = ko.computed({
        read: function () {
            return this.percentage() != null;
        },
        write: function (value) {
            this.duration(null);
            this.percentage(0);
        }, owner: this
    });

    // calculated entered duration
    this.checked_duration = ko.computed({
        read: function () {
            return this.duration() != null;
        },
        write: function (value) {
            this.percentage(null);
            this.duration('00:00:00');
        }, owner: this
    });

    // duration calculation
    this.entered_duration = ko.computed({
        read: function () {
            return this.duration();
        },
        write: function (value) {
            var value_parts = value.split(':');
            var hours = parseInt(value_parts[0]);
            var minutes = parseInt(value_parts[1]);
            var seconds = parseInt(value_parts[2]);
            var normalized_duration = Helper.calculate_duration(hours, minutes, seconds);
            this.duration(normalized_duration);
        }, owner: this
    });

    if (block_item_js)
        ko.mapping.fromJS(block_item_js, null, this);

};

// block layout
var block_layout_model = function () {

    // members
    this.block_items = ko.observableArray();
    this.file_finder = new file_finder_model();
    this.block_finder = new block_finder_model();

    // duration calculation
    this.total_duration = ko.computed(function() {
        var total_hours = 0;
        var total_minutes = 0;
        var total_seconds = 0;
        // get total duration
        ko.utils.arrayForEach(this.block_items(), function(item) {
            // get item duration
            var item_duration = item.file() ? item.file().duration() : item.duration();
            // verify we have something (not percentage)
            if (!item_duration)
                return;
            // calculate totals
            var duration_parts = item_duration.split(':');
            total_hours += parseInt(duration_parts[0]);
            total_minutes += parseInt(duration_parts[1]);
            total_seconds += parseInt(duration_parts[2]);
        });
        // get additional hours
        return Helper.calculate_duration(total_hours, total_minutes, total_seconds);
    }, this);

    // percentage calculation
    this.total_percentage = ko.computed(function() {
        var total_percentage = 0;
        ko.utils.arrayForEach(this.block_items(), function(item) {
            if (item.percentage() != null)
                total_percentage += parseFloat(item.percentage());
        });
        return total_percentage;
    }, this);

    this.add_block = function(block) {
        var block_item = new block_item_model(this);
        block_item.percentage(0);
        block_item.child_block(block);
        this.block_items.push(block_item);
    }.bind(this);

    this.add_selected_files = function() {
        ko.utils.arrayForEach(this.file_finder.files(), function(file) {
            if (!file.selected())
                return;
            var file_item = new block_item_model(this);
            file_item.file(file);
            this.block_items.push(file_item);
        }.bind(this));
    }.bind(this);

    // remove item
    this.remove_item = function(item) {
        this.block_items.remove(item)
    }.bind(this);

    // initialize
    ko.mapping.fromJS(block_items_js, {
        create: function(options) {
            return new block_item_model(this, options.data);
        }.bind(this)
    }, this.block_items);

};

// block model
var block_model = function(block) {

    // members
    this.title = ko.observable();
    this.description = ko.observable();
    this.file_query = ko.observable();
    this.harmonic = ko.observable(true);

    // initialize
    if (!block)
        return;
    // set vars
    this.title(block.title);
    this.description(block.description);
    this.file_query(block.file_query);
    this.harmonic(block.harmonic);

};

//////////////////////
// CLOUDCAST MODELS //
//////////////////////

// cloudcast display
var cloudcast_display_model = function () {

    // loop interval
    var loop_set_interval;
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
        $.get('/engine/input.rawxml', { input: input, enabled: !enabled });

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
            // calculate file percentage complete
            var current_file_percentage = (current_file_elapsed_seconds / current_file_duration_seconds) * 100;
            this.status().current_file_percentage(current_file_percentage);

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
            clearInterval(loop_set_interval);
            // update status object
            if (!this.status())
                this.status(new status_model(status_js));
            else
                this.status().update(status_js);

            var seconds = 0;
            // do initial loop update
            this.loop(seconds);
            // create new loop interval
            loop_set_interval = setInterval(function() {
                // update seconds
                seconds += 1;
                // execute the loop
                this.loop(seconds);
            }.bind(this), 1000);

        }.bind(this));
    }.bind(this);

    // initialize
    this.poll();
    // poll engine for status
    setInterval(function() {
        this.poll();
    }.bind(this), 5000);

};

/////////////////
// FILE MODELS //
/////////////////

// file finder
var file_finder_model = function () {

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

    this.toggle_select = function() {
        if (this.files().length == 0)
            return;
        var selected = !this.files()[0].selected();
        ko.utils.arrayForEach(this.files(), function(file) {
            file.selected(selected);
        });
    }.bind(this);

    this.clear = function() {
        this.query('');
    }.bind(this);

};

// file
var file_model = function (file) {

    // members
    this.selected = ko.observable(false);
    // properties
    this.id = ko.observable();
    this.found_on = ko.observable();
    this.last_play = ko.observable();
    this.date = ko.observable();
    this.track = ko.observable();
    this.BPM = ko.observable();
    this.rating = ko.observable();
    this.bit_rate = ko.observable();
    this.sample_rate = ko.observable();
    this.duration = ko.observable();
    this.title = ko.observable();
    this.album = ko.observable();
    this.artist = ko.observable();
    this.composer = ko.observable();
    this.conductor = ko.observable();
    this.copyright = ko.observable();
    this.genre = ko.observable();
    this.ISRC = ko.observable();
    this.label = ko.observable();
    this.language = ko.observable();
    this.mood = ko.observable();
    this.musical_key = ko.observable();
    this.energy = ko.observable();
    this.website = ko.observable();
    this.name = ko.observable();

    // calculated description
    this.description = ko.computed(function() {
        var data = new Array();
        data.push('<strong>id</strong> ' + this.id());
        data.push('<strong>found_on</strong> ' + this.found_on());
        data.push('<strong>last_play</strong> ' + this.last_play());
        data.push('<strong>date</strong> ' + this.date());
        data.push('<strong>track</strong> ' + this.track());
        data.push('<strong>BPM</strong> ' + this.BPM());
        data.push('<strong>rating</strong> ' + this.rating());
        data.push('<strong>bit_rate</strong> ' + this.bit_rate());
        data.push('<strong>sample_rate</strong> ' + this.sample_rate());
        data.push('<strong>duration</strong> ' + this.duration());
        data.push('<strong>title</strong> ' + this.title());
        data.push('<strong>album</strong> ' + this.album());
        data.push('<strong>artist</strong> ' + this.artist());
        data.push('<strong>composer</strong> ' + this.composer());
        data.push('<strong>conductor</strong> ' + this.conductor());
        data.push('<strong>copyright</strong> ' + this.copyright());
        data.push('<strong>genre</strong> ' + this.genre());
        data.push('<strong>ISRC</strong> ' + this.ISRC());
        data.push('<strong>label</strong> ' + this.label());
        data.push('<strong>language</strong> ' + this.language());
        data.push('<strong>mood</strong> ' + this.mood());
        data.push('<strong>musical_key</strong> ' + this.musical_key());
        data.push('<strong>energy</strong> ' + this.energy());
        data.push('<strong>website</strong> ' + this.website());
        data.push('<strong>name</strong> ' + this.name());
        return data.join('<br />');
    }, this);

    // deactivate
    this.deactivate = function() {
        $.get('/files/deactivate.rawxml', { 'id': this.id() }, function () {
            this.available('0');
        }.bind(this));
    }.bind(this);

    // activate
    this.activate = function() {
        $.get('/files/activate.rawxml', { 'id': this.id() }, function () {
            this.available('1');
        }.bind(this));
    }.bind(this);

    // mapping
    ko.mapping.fromJS(file, null, this);

};

// file viewer
var file_viewer_model = function() {

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
        $.get('/files/search.json', { query: query }, function (data) {
            // clear existing data
            this.files([]);
            // check for no data
            if (!data)
                return;
            // add files
            ko.utils.arrayForEach(data, function(file) {
                this.files.push(new file_model(file));
            }.bind(this));
        }.bind(this));
    }.bind(this);

};

// files
var files_index_model = function () {

    // members
    this.query = ko.observable();
    this.files = ko.observableArray();

    // file finder
    this.query.subscribe(function(value) {
        $.get('/files/search.json', { query: value }, function (data) {
            // clear existing data
            this.files([]);
            // check for no data
            if (!data)
                return;
            // add files
            ko.utils.arrayForEach(data, function(file) {
                this.files.push(new file_model(file));
            }.bind(this));
        }.bind(this));
    }.bind(this));

    // clear data
    this.clear = function() {
        this.query('');
    }.bind(this);

};

/////////////////////
// SCHEDULE MODELS //
/////////////////////

// schedule date
var schedule_date_model = function(schedule_date, schedule_index) {

    // members
    this.schedules = ko.observableArray();

    // delete schedule
    this.delete = function(schedule) {

        // setup modal
        $('#cloudcast_modal-delete .modal-body').html('Are you sure you want to delete this schedule for show "' + schedule.show.title() + '"?');
        $('#cloudcast_modal-delete button[name=delete]').off().click(function () {
            // remove server side
            $.get('schedules/delete/' + schedule.id() + '.rawxml', function() {
                // remove locally
                this.schedules.remove(schedule);
                // if we have no more schedules, delete this date
                if (this.schedules().length == 0)
                    schedule_index.delete_schedule_date(this);
                // hide modal
                $('#cloudcast_modal-delete').modal('hide');
            }.bind(this));
        }.bind(this));

        // show modal
        $('#cloudcast_modal-delete').modal('show');

    }.bind(this);

    // initialize
    ko.mapping.fromJS(schedule_date, {
        'schedules': {
            create: function(options) {
                return new schedule_model(options.data);
            }
        }
    }, this);

};

// schedule file
var schedule_file_model = function(schedule_file_js) {

    this.played_on = ko.observable();
    this.file = ko.observable();
    ko.mapping.fromJS(schedule_file_js, null, this);

}

// schedules index
var schedules_index_model = function() {

    // members
    this.schedule_dates = ko.observableArray();
    this.editing_schedule = ko.observable();
    this.file_finder = new file_finder_model();
    var original_editing_schedule_files;

    // delete date (when has no content)
    this.delete_schedule_date = function(schedule_date) {
        this.schedule_dates.remove(schedule_date);
    }.bind(this);

    // toggle edit
    this.edit_schedule = function(schedule) {
        // get currently editing schedule
        var current_editing_schedule = this.editing_schedule();
        // cancel changes for this edit
        // by repopulating the origina schedule files
        if (current_editing_schedule)
            current_editing_schedule.schedule_files(original_editing_schedule_files);
        // if the current is the requested, cancel editing
        if (current_editing_schedule == schedule) {
            // cancel all editing
            this.editing_schedule(null);
        } else {
            // backup schedule files
            original_editing_schedule_files = schedule.schedule_files().slice();
            // switch editing to this requested schedule
            this.editing_schedule(schedule);
        }
    }.bind(this);

    // save
    this.save_schedule = function(schedule) {
        var schedule_files = new Array();
        // get DTO for schedule file changes
        ko.utils.arrayForEach(schedule.schedule_files(), function(schedule_file) {
            schedule_files.push({ 'file_id': schedule_file.file().id() })
        });
        // post DTO for saving
        $.post('schedules/save.rawxml', { 'id': schedule.id(), 'schedule_files': schedule_files }, function(response) {
            // verify response
            if (response != 'SUCCESS')
                return;
            // turn off editing
            this.editing_schedule(null);
        }.bind(this));
    }.bind(this);

    // bind to file finder add button
    this.add_selected_files = function() {
        // get currently editing schedule
        var current_editing_schedule = this.editing_schedule();
        // verify we have a schedule under edit
        if (!current_editing_schedule)
            return;
        // add each selected file as a schedule file
        ko.utils.arrayForEach(this.file_finder.files(), function(file) {
            if (!file.selected())
                return;
            var schedule_file = new schedule_file_model();
            schedule_file.file(file);
            current_editing_schedule.schedule_files.push(schedule_file);
        }.bind(this));
    }.bind(this);

    // set schedule dates
    ko.mapping.fromJS(schedule_dates_js, {
        create: function(options) {
            return new schedule_date_model(options.data, this);
        }.bind(this)
    }, this.schedule_dates);

};

// schedule
var schedule_model = function(schedule) {

    // members
    this.schedule_files = ko.observableArray();
    this.editing = ko.observable(false);

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

    // delete file
    this.delete_file = function(schedule_file) {
        this.schedule_files.remove(schedule_file);
    }.bind(this);

    // mapping
    ko.mapping.fromJS(schedule, {
        'schedule_files': {
            create: function(options) {
                return new schedule_file_model(options.data);
            }.bind(this)
        }
    }, this);

};

////////////////////
// SETTING MODELS //
////////////////////

// settings index
var settings_index_model = function() {

};

/////////////////
// SHOW MODELS //
/////////////////

// show form
var show_form_model = function() {

    // show
    this.show = ko.observable();

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

    // set show
    this.show(new show_model(show_js));

};

// show
var show_model = function(show) {

    // members
    this.title = ko.observable();
    this.description = ko.observable();
    this.user_start_on = ko.observable();
    this.user_end_at = ko.observable();
    this.duration = ko.observable();
    this.title = ko.observable();
    this.blocked = ko.observable();
    this.repeated = ko.observable();
    this.hosted = ko.observable();
    this.block = ko.observable();
    this.repeat = ko.observable();
    this.show_repeat = ko.observable();
    this.users = ko.observableArray();

    // add username
    this.add_user = function() {
        this.users.push(new user_model());
    }.bind(this);

    // remove username
    this.remove_user = function(user) {
        this.users.remove(user)
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

    // duration subscriptions
    this.user_start_on.subscribe(function(value) {
        this.duration(this.calculate_duration(value, this.user_end_at()))
    }.bind(this));
    this.user_end_at.subscribe(function(value) {
        this.duration(this.calculate_duration(this.user_start_on(), value))
    }.bind(this));

    // initialize
    if (show) {

        // set show data
        this.title(show.title);
        this.description(show.description);
        this.user_start_on(show.user_start_on);
        this.user_end_at(Helper.datetime_add_duration(show.user_start_on, show.duration));
        this.duration(show.duration);

        // if we don't have a repeat, make one
        this.show_repeat(new show_repeat_model(show.show_repeat));
        this.repeated(show.show_repeat ? true : false);

        // set users
        for (var user_index in show.users)
            this.users.push(new user_model(show.users[user_index]));
        // if we don't have a user, add one
        if (show.users.length == 0)
            this.add_user();
        else
            this.hosted(true);

        // set block
        this.block(new block_model(show.block));
        this.blocked(show.block ? true : false);

    } else {

        // create a user
        this.add_user();
        // create a block
        this.block(new block_model());
        // create a repeat
        this.show_repeat(new show_repeat_model());

    }

};

// show repeat model
var show_repeat_model = function(show_repeat) {

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

    // initialize
    if (!show_repeat)
        return;

    this.Sunday(show_repeat.Sunday == '1' ? true : false);
    this.Monday(show_repeat.Monday == '1' ? true : false);
    this.Tuesday(show_repeat.Tuesday == '1' ? true : false);
    this.Wednesday(show_repeat.Wednesday == '1' ? true : false);
    this.Thursday(show_repeat.Thursday == '1' ? true : false);
    this.Friday(show_repeat.Friday == '1' ? true : false);
    this.Saturday(show_repeat.Saturday == '1' ? true : false);
    this.ends(show_repeat.end_on ? true : false);
    this.user_end_on(show_repeat.user_end_on);

};

///////////////////
// STATUS MODELS //
///////////////////

// status
var status_model = function (status_js) {

    // standard members
    this.current_file_artist = ko.observable();
    this.current_file_title = ko.observable();
    this.current_file_duration = ko.observable();
    this.next_file_artist = ko.observable();
    this.next_file_title = ko.observable();
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
    this.current_file_elapsed = ko.observable();
    this.current_show_elapsed = ko.observable();
    this.updated_on_time = ko.observable();
    // input statuses
    this.schedule_input_active = ko.observable();
    this.show_input_active = ko.observable();
    this.talkover_input_active = ko.observable();
    this.master_input_active = ko.observable();
    // input enableds
    this.schedule_input_active = ko.observable();
    this.show_input_active = ko.observable();
    this.talkover_input_active = ko.observable();
    this.master_input_active = ko.observable();
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
var stream_form_model = function () {

    // members
    this.stream = ko.observable();
    // set stream
    this.stream(new stream_model(stream_js));

};

// streams index model
var streams_index_model = function() {

    // members
    this.streams = ko.observableArray();

    // delete user
    this.delete = function(stream) {
        $('#cloudcast_modal-delete .modal-body').html('Are you sure you want to delete the stream "' + stream.name + '"?');
        $('#cloudcast_modal-delete button[name=delete]').off().click(function () { window.location.replace('/streams/delete/' + stream.id); });
        $('#cloudcast_modal-delete').modal('show');
    };

    // initialize
    ko.mapping.fromJS(streams_js, {
        create: function(options) {
            return new stream_model(options.data);
        }.bind(this)
    }, this.streams);

};

// user model
var stream_model = function(stream) {

    // members
    this.id = ko.observable();
    this.name = ko.observable();
    this.type = ko.observable();
    this.type_name = ko.observable();
    this.port = ko.observable();
    this.host = ko.observable();
    this.source_username = ko.observable();
    this.source_password = ko.observable();
    this.admin_username = ko.observable();
    this.admin_password = ko.observable();
    this.password = ko.observable();
    this.mount = ko.observable();
    this.active = ko.observable();

    // deactivate
    this.deactivate = function() {
        $.get('/streams/deactivate.rawxml', { 'id': this.id() }, function () {
            this.active('0');
        }.bind(this));
    }.bind(this);

    // activate
    this.activate = function() {
        $.get('/streams/activate.rawxml', { 'id': this.id() }, function () {
            this.active('1');
        }.bind(this));
    }.bind(this);

    // initialize
    if (stream)
        ko.mapping.fromJS(stream, null, this);
    else
        this.type(0);

};

/////////////////
// USER MODELS //
/////////////////

// user form
var user_form_model = function() {

    // user
    this.user = ko.observable();
    // set user
    this.user(new user_model(user_js));

};

// user model
var user_model = function(user) {

    // members
    this.username = ko.observable();
    this.old_password = ko.observable();
    this.password = ko.observable();
    this.group = ko.observable();
    this.email = ko.observable();
    this.first_name = ko.observable();
    this.last_name = ko.observable();
    this.phone = ko.observable();

    // initialize
    if (user) {
        this.username(user.username);;
        this.group(user.group);
        this.email(user.email);
        this.phone(user.profile_fields.phone);
        this.first_name(user.profile_fields.first_name);
        this.last_name(user.profile_fields.last_name);
    } else {
        this.group(0);
    }

};

// users index model
var users_index_model = function() {

    // members
    this.users = ko.observableArray(users_js);

    // delete user
    this.delete = function(user) {
        $('#cloudcast_modal-delete .modal-body').html('Are you sure you want to delete the user "' + user.username + '"?');
        $('#cloudcast_modal-delete button[name=delete]').off().click(function () { window.location.replace('/users/delete/' + user.username); });
        $('#cloudcast_modal-delete').modal('show');
    };

};

///////////
// HOOKS //
///////////

// blocks
function hook_blocks() {

    // layout
    var blocks_layout_element = document.getElementById('blocks_layout');
    if (blocks_layout_element)
        ko.applyBindings(new block_layout_model(), blocks_layout_element);

    // form
    var blocks_form_element = document.getElementById('blocks_form');
    if (blocks_form_element)
        ko.applyBindings(new block_form_model(), blocks_form_element);

    // block delete
    $('#blocks_index a[name=delete]').click(function () {
        $('#cloudcast_modal-delete .modal-body').html('Are you sure you want to delete the block "' + $(this).data('title') + '"?');
        var id = $(this).data('id');
        $('#cloudcast_modal-delete button[name=delete]').off().click(function () { window.location.replace('/blocks/delete/' + id); });
        $('#cloudcast_modal-delete').modal('show');
    });

}

// general
function hook_cloudcast() {

    // status display
    ko.applyBindings(new cloudcast_display_model(), document.getElementById('cloudcast_display'));

    // initialize modals
    $('.cloudcast_modal-success').modal('hide');
    $('.cloudcast_modal-error').modal('hide');
    $('.cloudcast_modal-delete').modal('hide');

}

// files
function hook_files() {

    // index
    var file_index_element = document.getElementById('files_index');
    if (file_index_element)
        ko.applyBindings(new files_index_model(), file_index_element);

}

// schedules
function hook_schedules() {

    // index
    var schedules_index_element = document.getElementById('schedules_index');
    if (schedules_index_element)
        ko.applyBindings(new schedules_index_model(), schedules_index_element);

}

// settings
function hook_settings() {

    // index
    var settings_index_element = document.getElementById('settings_index');
    if (settings_index_element)
        ko.applyBindings(new settings_index_model(), settings_index_element);

}

// shows
function hook_shows() {

    // form
    var shows_form_element = document.getElementById('shows_form');
    if (shows_form_element)
        ko.applyBindings(new show_form_model(), shows_form_element);

    // show delete
    $('#shows_index a[name=delete]').click(function () {
        $('#cloudcast_modal-delete .modal-body').html('Are you sure you want to delete the show "' + $(this).data('title') + '"?');
        var id = $(this).data('id');
        $('#cloudcast_modal-delete button[name=delete]').off().click(function () { window.location.replace('/shows/delete/' + id); });
        $('#cloudcast_modal-delete').modal('show');
    });

}

// streams
function hook_streams() {

    // index
    var streams_index_element = document.getElementById('streams_index');
    if (streams_index_element)
        ko.applyBindings(new streams_index_model(), streams_index_element);
    // form
    var stream_form_element = document.getElementById('streams_form');
    if (stream_form_element)
        ko.applyBindings(new stream_form_model(), stream_form_element);

}

// users
function hook_users() {

    // index
    var users_index_element = document.getElementById('users_index');
    if (users_index_element)
        ko.applyBindings(new users_index_model(), users_index_element);
    // form
    var user_form_element = document.getElementById('user_form');
    if (user_form_element)
        ko.applyBindings(new user_form_model(), user_form_element);

}

///////////
// READY //
///////////

$(function() {
    setTimeout(function() {
        hook_blocks();
        hook_cloudcast();
        hook_files();
        hook_schedules();
        hook_settings();
        hook_shows();
        hook_streams();
        hook_users();
    }, 0);
});