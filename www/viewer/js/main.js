/**
 *
 */
require.config({
    paths: {
        'jquery': 'libs/jquery',
        'jqueryxpath': 'libs/jquery.xpath',
        'leaflet': 'http://cdn.leafletjs.com/leaflet-0.6.4/leaflet',
        'jqueryui': 'http://code.jquery.com/ui/1.11.1/jquery-ui.min',
        'underscore': 'https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.7.0/underscore-min'
    }
});
require(['modules/tosplit']);