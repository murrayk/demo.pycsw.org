/**
 *
 */

define(['modules/model', 'jquery', 'leaflet', 'jqueryui'], function (recordsModel) {
    var map = null;
    var map_layers_control = null;
    var csw_url = "http://localhost/pycsw-wsgi";
    var csw_ip_url = "http://localhost/pycsw-wsgi";
    var pagesize = 10;




    function truncate(value, length) {
        if (value.length > length) {
            return value.substring(0, length) + '...';
        }
        return value;
    }


    function bbox2polygon(bbox) {
        if (bbox == null) {
            return new L.Polygon();
        }
        var coords = bbox.split(',');
        var p1 = new L.LatLng(coords[0], coords[1]),
            p2 = new L.LatLng(coords[2], coords[1]),
            p3 = new L.LatLng(coords[2], coords[3]),
            p4 = new L.LatLng(coords[0], coords[3]),
            polygonPoints = [p1, p2, p3, p4];
        return new L.Polygon(polygonPoints);
    }

    function style_record(rec) {
        var snippet = "<tr><td>";
        snippet += "<a id='showFullRec' href='#'>An anchor</a></tr></td><tr><td>";
        var links = "";
        // get all links
        for (var i = 0; i < rec.references.length; i++) {
            if (rec.references[i].value != "None" && rec.references[i].value.lastIndexOf("http", 0) === 0) {
                if (rec.references[i].scheme == 'OGC:WMS-1.1.1-http-get-map') {
                    urlbase = rec.references[i].value.split('?')[0];
                    links += '<span id="' + rec.references[i].value + '##' + rec.title + '" class="btn btn-primary btn-sm">Add to map</span>';
                } else {
                    var shortCode = recordsModel.protocolShortCode(rec.references[i].scheme);
                    links += ' <a class="btn btn-primary btn-sm" title="' + rec.references[i].scheme + '" href="' + rec.references[i].value + '">' + shortCode + '</a> ';
                }
            }
        }

        url = csw_ip_url + "?service=CSW&version=2.0.2&request=GetRecordById&elementsetname=full&id=" + rec.identifier;
        title2 = '<a id="' + rec.bbox.csv + '" class="a-record" target="_blank" title="' + rec.title + '" href="' + url + '">' + rec.title + '</a>';
        snippet += '<h5>' + title2 + '</h5>';
        snippet += '<h5>' + truncate(rec.abstract, 255) + '</h5>';
        snippet += '<em>' + rec.publisher + '</em><br/>';
        snippet += '<small><strong>Date</strong>: ' + rec.date + '</small><br/>';
        snippet += links;
        snippet += '</td></tr>';
        return snippet;
    }

    function search(startposition) {
        $('#div-csw-results-glass').toggle();

        if (!startposition) {
            startposition = 1;
        }
        var freetext = $('#input-anytext').val().trim();
        var bbox_enabled = $('#input-bbox').is(':checked');
        var sortby = $('#select-sortby option:selected').val();

        if (bbox_enabled && map != null) {
            bounds = map.getBounds();
            qbbox = '<ogc:BBOX><ogc:PropertyName>ows:BoundingBox</ogc:PropertyName><gml:Envelope xmlns:gml="http://www.opengis.net/gml"><gml:lowerCorner>' + bounds.getSouth() + ' ' + bounds.getWest() + '</gml:lowerCorner><gml:upperCorner>' + bounds.getNorth() + ' ' + bounds.getEast() + '</gml:upperCorner></gml:Envelope></ogc:BBOX>';
        }

        data = '<csw:GetRecords maxRecords="' + pagesize + '" startPosition="' + startposition + '" outputFormat="application/xml" outputSchema="http://www.opengis.net/cat/csw/2.0.2" resultType="results" service="CSW" version="2.0.2" xsi:schemaLocation="http://www.opengis.net/cat/csw/2.0.2 http://schemas.opengis.net/csw/2.0.2/CSW-discovery.xsd" xmlns:ogc="http://www.opengis.net/ogc" xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><csw:Query typeNames="csw:Record"><csw:ElementSetName>full</csw:ElementSetName>';
        if (freetext != '') {
            if (bbox_enabled && map != null) {
                data += '<csw:Constraint version="1.1.0"><ogc:Filter><ogc:And><ogc:PropertyIsLike escapeChar="\\" singleChar="_" wildCard="%"><ogc:PropertyName>csw:AnyText</ogc:PropertyName><ogc:Literal>%' + $("#input-anytext").val().trim() + '%</ogc:Literal></ogc:PropertyIsLike>' + qbbox + '</ogc:And></ogc:Filter></csw:Constraint>';
            } else {
                data += '<csw:Constraint version="1.1.0"><ogc:Filter><ogc:PropertyIsLike escapeChar="\\" singleChar="_" wildCard="%"><ogc:PropertyName>csw:AnyText</ogc:PropertyName><ogc:Literal>%' + $("#input-anytext").val().trim() + '%</ogc:Literal></ogc:PropertyIsLike></ogc:Filter></csw:Constraint>';
            }
        } else if (bbox_enabled && map != null) {
            data += '<csw:Constraint version="1.1.0"><ogc:Filter>' + qbbox + '</ogc:Filter></csw:Constraint>';
        }

        data += '</csw:Query></csw:GetRecords>';

        $.ajax({
            type: "post",
            url: csw_ip_url,
            contentType: "text/xml",
            data: data,
            dataType: "text",
            success: function (xml) {
                $('#table-csw-results').empty();
                $('#div-csw-results-glass').toggle();
                //alert(xml);
                // derive results for paging
                summary = recordsModel.resultsSummary(xml);


                $('#input-startposition').val(startposition);
                $('#input-nextrecord').val(summary.nextrecord);
                $('#input-matched').val(summary.matched);

                if (summary.isResults()) {
                    $('#div-results').html('');
                    $('#table-csw-results').html('<tr><td>No results</td></tr>');
                    return;
                }
                if (summary.moreRecords()) { // at the end
                    $('#li-next').attr('class', 'disabled');
                } else {
                    $('#li-next').attr('class', 'active');
                }
                if (startposition == 1) {
                    $('#li-previous').attr('class', 'disabled');
                } else {
                    $('#li-previous').attr('class', 'active');
                }

                var results = '<strong>Results ' + startposition + '-' + summary.nextrecord + ' of ' + summary.matched + ' record(s)</strong>';

                $('#div-results').html(results);
                var cswRecords = recordsModel.createRecordsModel(xml);

                $(cswRecords).each(function (record) {
                    $("#table-csw-results").append(style_record(this));
                })
            }
        });
    }
    $(document).ready(function () {
        // init the map

        $(document).on('click', '#showFullRec', function () {
            $("#dialog-message").dialog({
                modal: true,
                draggable: false,
                resizable: false,
                position: ['center', 'top'],
                show: 'blind',
                hide: 'blind',
                width: 400,
                dialogClass: 'ui-dialog-osx',
                buttons: {
                    "I've read and understand this": function () {
                        $(this).dialog("close");
                    }
                }
            });
            $("#dialog-message").removeClass('hidden');
        });
        polygon_layer = null;
        map = L.map('div-map').setView([10, 0], 1);
        basemap = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        })
        map.addLayer(basemap);
        map_layers_control = L.control.layers({
            "basemap": basemap
        }, {}, {
            'collapsed': true
        }).addTo(map);
        // init the results table with CSW results
        search();
        // handle CSW searches
        $("#form-search").keypress(function (e) {
            if (e.keyCode == 13) { // Enter key pressed, but not submitting the form to a page refresh
                search();
                return false;
            }
        });
        $('#a-previous').click(function (event) {
            event.preventDefault();
            startposition2 = $('#input-startposition').val() - pagesize;
            if (startposition2 < 1) {
                return;
            }
            search(startposition2);
        });
        $('#a-next').click(function (event) {
            event.preventDefault();
            nextrecord2 = parseInt($('#input-nextrecord').val());
            matched2 = parseInt($('#input-matched').val());
            if (nextrecord2 == 0 || nextrecord2 >= matched2) {
                return;
            }
            search(nextrecord2);
        });
        $("table").on("click", "span", function (event) {
            var tokens = $(this).attr('id').split('##');
            var getmap = tokens[0].split('?');
            var url = getmap[0];
            var getmap_kvp = getmap[1].split('&');;
            for (var i = 0; i < getmap_kvp.length; i++) {
                var temp = getmap_kvp[i].toLowerCase();
                if (temp.search('layers') != -1) {
                    var kvp = getmap_kvp[i].split('=');
                    var layer_name = kvp[1];
                }
            }

            for (var prop in map_layers_control._layers) {
                if (url == map_layers_control._layers[prop].layer._url && tokens[1] == map_layers_control._layers[prop].name) {
                    return;
                }
            }

            var layer = L.tileLayer.wms(url, {
                layers: layer_name,
                format: 'image/png',
                transparent: true,
            });
            map_layers_control.addOverlay(layer, tokens[1]);
            map.addLayer(layer);
        });
        $("table").on("mouseenter", "td", function (event) {
            bbox = $(this).find('[id]').attr('id');
            if (polygon_layer != null && map.hasLayer(polygon_layer)) {
                map.removeLayer(polygon_layer);
            }
            if ($('#input-footprints').is(':checked')) {
                if (bbox != undefined) {
                    polygon_layer = bbox2polygon(bbox);
                    map.addLayer(polygon_layer);
                }
            }
        });
    });
});