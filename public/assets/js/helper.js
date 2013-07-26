var Helper = {

    pad: function(str, max) {
        return str.length < max ? Helper.pad("0" + str, max) : str;
    },

    duration: function(start_date, end_date) {
        var one_day = 1000 * 60 * 60 * 24;
        if ((start_date >= end_date) || ((end_date - start_date) > one_day)) {
            return '00:00:00';
        } else {
            var length = (end_date - start_date);
            var hours = Math.floor(length / 1000 / 60 / 60);
            var minutes = Math.round(length / 1000 / 60) % 60;
            return Helper.pad(hours.toString(), 2) + ':' + Helper.pad(minutes.toString(), 2) + ':00';
        };
    },

    calculate_duration: function(hours, minutes, seconds) {
        minutes += Math.floor(seconds / 60);
        hours += Math.floor(minutes / 60);
        minutes = minutes % 60;
        seconds = seconds % 60;
        return Helper.pad(hours.toString(), 2) + ':'
            + Helper.pad(minutes.toString(), 2) + ':'
            + Helper.pad(seconds.toString(), 2);
    },

    normalized_duration: function(duration) {
        var duration_parts = duration.split(':');
        if (duration_parts.length == 3) {
            var hours = parseInt(duration_parts[0]);
            var minutes = parseInt(duration_parts[1]);
            var seconds = parseInt(duration_parts[2]);
            return Helper.pad(hours.toString(), 2) + ':'
                + Helper.pad(minutes.toString(), 2) + ':'
                + Helper.pad(seconds.toString(), 2);
        } else {
            var minutes = parseInt(duration_parts[0]);
            var seconds = parseInt(duration_parts[1]);
            return '00:'
                + Helper.pad(minutes.toString(), 2) + ':'
                + Helper.pad(seconds.toString(), 2);
        }
    },

    normalize_datetime: function(str) {
        if (!str)
            return undefined;
        return str.substr(0, str.lastIndexOf(':'));
    },

    datetime_add_duration: function(start_datetime, normalized_duration) {
        var start_date = Helper.date(start_datetime);
        var normalized_duration_parts = normalized_duration.split(':');
        var hours = parseInt(normalized_duration_parts[0]);
        var minutes = parseInt(normalized_duration_parts[1]);
        var seconds = parseInt(normalized_duration_parts[2]);
        var end_date = new Date(start_date.getTime() + (hours * 3600000) + (minutes * 60000) * (seconds * 1000));
        return end_date.format("yyyy-mm-dd HH:MM");
    },

    date_datetime: function(date) {
        return date.format("yyyy-mm-dd HH:MM");
    },

    date_datetime_ex: function(date) {
        return date.format("yyyy-mm-dd HH:MM:ss");
    },

    seconds_duration: function(seconds) {
        // verify
        if (seconds <= 0)
            return '00:00:00';
        // get number remainder seconds
        var duration_seconds = seconds % 60;
        var duration_minutes = Math.floor(seconds / 60) % 60;
        var duration_hours = Math.floor(seconds / 60 / 60);
        // return duration string
        return Helper.pad(duration_hours.toString(), 2) + ':'
            + Helper.pad(duration_minutes.toString(), 2) + ':'
            + Helper.pad(duration_seconds.toString(), 2);
    },

    date_date_seconds: function(start_date, end_date) {
        var miliseconds = end_date.getTime() - start_date.getTime();
        return Math.floor(miliseconds / 1000);
    },

    duration_seconds: function(duration) {
        var duration_parts = duration.split(':');
        return (parseInt(duration_parts[0]) * 60 * 60)
			+ (parseInt(duration_parts[1]) * 60)
			+ ((duration_parts.length > 2) ? parseInt(duration_parts[2]) : 0);
    },

    time_string: function() {
        // get time data
        var currentTime = new Date();
        var currentHours = currentTime.getHours();
        var currentMinutes = currentTime.getMinutes();
        var currentSeconds = currentTime.getSeconds();
        // pad the minutes and seconds with leading zeros, if required
        currentHours = ( currentHours < 10 ? "0" : "" ) + currentHours;
        currentMinutes = ( currentMinutes < 10 ? "0" : "" ) + currentMinutes;
        currentSeconds = ( currentSeconds < 10 ? "0" : "" ) + currentSeconds;
        // compose the string for display
        return currentHours + ":" + currentMinutes + ":" + currentSeconds;
    },

    date: function(str) {
        if (!str)
            return undefined;
        var t = str.split(/[- :]/);
        return new Date(t[0], t[1]-1, t[2], t[3], t[4], (t.length > 5) ? t[5] : 0);
    },

    datetime_time: function(datetime) {
        var datetime_parts = datetime.split(' ');
        return datetime_parts[1];
    },

    s4: function() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    },

    guid: function() {
        return Helper.s4() + Helper.s4() + '-' + Helper.s4() + '-' + Helper.s4() + '-' + Helper.s4() + '-' + Helper.s4() + Helper.s4() + Helper.s4();
    }

}