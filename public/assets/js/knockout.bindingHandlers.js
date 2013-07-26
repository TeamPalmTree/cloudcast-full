// typeahead
ko.bindingHandlers['typeahead'] = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var value = valueAccessor();
        var allBindings = allBindingsAccessor();
        // get options
        var options = allBindings.typeaheadOptions;
        // call bootstrap typeahead
        $(element).typeahead(options);
        // set up value binding
        ko.bindingHandlers.value.init(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
    },
    update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        // set up value binding
        ko.bindingHandlers.value.update(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
    }
};

// date time picker
ko.bindingHandlers['datetimepicker'] = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var value = valueAccessor();
        var allBindings = allBindingsAccessor();
        // get options
        var options = allBindings.datetimepickerOptions;
        // extend options with defaults
        options = jQuery.extend(
            {
                format: 'yyyy-mm-dd hh:ii',
                autoclose: true
            },
            options);
        // call bootstrap datetimepicker
        $(element).datetimepicker(options);
        // set up value binding
        ko.bindingHandlers.value.init(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
    },
    update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        // set up value binding
        ko.bindingHandlers.value.update(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
    }
};

// typeahead
ko.bindingHandlers['popover'] = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        var value = valueAccessor();
        var allBindings = allBindingsAccessor();
        // get options
        var options = value;

        // see if we have a template specified
        if (options.templateId) {

            // get template html
            var templateHtml = $('#' + options.templateId).html();
            // create unique identifier to bind to
            var contentGuid = Helper.guid();
            var contentId = "ko-popover-" + contentGuid;
            // create correct binding context
            var childBindingContext = bindingContext.createChildContext(viewModel);
            // create DOM object to use for popover content
            var contentHtml = "<div id='" + contentId + "'>" + templateHtml + "</div>";
            // set popover options content & html render mode
            options.content = contentHtml;
            options.html = true;

            // call bootstrap typeahead
            $(element).popover(options);

            // get trigger
            var trigger = $(element).data('popover').options.trigger;
            // update triggers
            if (trigger === 'hover')
                trigger = 'mouseenter mouseleave';
            else if (trigger === 'focus')
                trigger = 'focus blur';
            // apply binding function
            $(element).on(trigger, function() {
                ko.applyBindingsToDescendants(childBindingContext, document.getElementById(contentId));
            });

            // Also tell KO *not* to bind the descendants itself, otherwise they will be bound twice
            return { controlsDescendantBindings: true };

        } else {

            // call bootstrap typeahead
            $(element).popover(options);

        }

    }
};

// tooltip
ko.bindingHandlers['tooltip'] = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var value = valueAccessor();
        var allBindings = allBindingsAccessor();
        // get options
        var options = value;
        // call bootstrap tooltip
        $(element).tooltip(options);
    }
};

// tablesorter
ko.bindingHandlers['tablesorter'] = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var value = valueAccessor();
        var allBindings = allBindingsAccessor();
        // get options
        var options = allBindings.tablesorterOptions;
        // call jquery tablesorter
        $(element).tablesorter(options);
    },
    update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        // create the dependency
        var data = ko.utils.unwrapObservable(valueAccessor());
        var resort = true;
        $(element).trigger('destroy');
        $(element).tablesorter();
        //$(element).trigger("update", [resort]);
    }
};