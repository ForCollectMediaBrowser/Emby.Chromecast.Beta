﻿define(['datetime', 'fetchhelper'], function (datetime, fetchhelper) {

    var factory = {};
    var controlsPromise, delayStartPromise, closeAppPromise;

    var setControls = function ($scope) {
        clearTimeout(controlsPromise);
        controlsPromise = setTimeout(function () {
            if ($scope.status == 'playing-with-controls') {
                setAppStatus('playing');
            }
        }, 8000);
    };

    var setApplicationClose = function () {
        clearTimeout(closeAppPromise);
        closeAppPromise = setTimeout(function () {
            window.close();
        }, 3600000, false);
    };

    var clearTimeouts = function () {
        clearTimeout(controlsPromise);
        clearTimeout(closeAppPromise);
        clearTimeout(delayStartPromise);
    };

    var fallBackBackdropImg = function ($scope, src) {
        if (!src) {
            // Use try/catch in case an [$rootScope:inprog] is thrown
            try {
                $scope.backdrop = "img/bg.jpg";

            }
            catch (err) {

            }
            return;
        }

        var setBackdrop = function () {
            var imageSrc = this.src;
            $scope.backdrop = imageSrc;
        };

        var loadElement = document.createElement('img');
        loadElement.src = src;
        loadElement.addEventListener('error', function () {
            loadElement.removeEventListener('load', setBackdrop);
        });

        loadElement.addEventListener('load', setBackdrop);
        setTimeout(function () {
            loadElement.removeEventListener('load', setBackdrop);
        }, 30000);
    };

    var pingInterval;
    var lastTranscoderPing = 0;

    function restartPingInterval($scope, reportingParams) {

        stopPingInterval();

        if (reportingParams.PlayMethod == 'Transcode') {
            pingInterval = setInterval(function () {
                factory.pingTranscoder($scope, {
                    PlaySessionId: reportingParams.PlaySessionId
                });
            }, 1000);
        }
    }

    function stopPingInterval() {

        var current = pingInterval;

        if (current) {
            clearInterval(current);
            pingInterval = null;
        }
    }

    factory.stopPingInterval = function () {
        stopPingInterval();
    };

    factory.reportPlaybackStart = function ($scope, options) {

        this.stopDynamicContent();

        if (!$scope.userId) {
            throw new Error("null userId");
        }

        if (!$scope.serverAddress) {
            throw new Error("null serverAddress");
        }

        var url = getUrl($scope.serverAddress, "Sessions/Playing");

        broadcastToMessageBus({
            type: 'playbackstart',
            data: getSenderReportingData($scope, options)
        });

        restartPingInterval($scope, options);

        return fetchhelper.ajax({

            url: url,
            headers: getSecurityHeaders($scope.accessToken, $scope.userId),
            type: 'POST',
            data: JSON.stringify(options),
            contentType: 'application/json'
        });
    };

    factory.reportPlaybackProgress = function ($scope, options, reportToServer) {

        if (!$scope.userId) {
            throw new Error("null userId");
        }

        if (!$scope.serverAddress) {
            throw new Error("null serverAddress");
        }

        broadcastToMessageBus({
            type: 'playbackprogress',
            data: getSenderReportingData($scope, options)
        });

        if (reportToServer === false) {
            return new Promise(function (resolve, reject) {
                resolve();
            });
        }

        var url = getUrl($scope.serverAddress, "Sessions/Playing/Progress");

        restartPingInterval($scope, options);
        lastTranscoderPing = new Date().getTime();

        return fetchhelper.ajax({

            url: url,
            headers: getSecurityHeaders($scope.accessToken, $scope.userId),
            type: 'POST',
            data: JSON.stringify(options),
            contentType: 'application/json'
        });
    };

    factory.reportPlaybackStopped = function ($scope, options) {

        stopPingInterval();

        if (!$scope.userId) {
            throw new Error("null userId");
        }

        if (!$scope.serverAddress) {
            throw new Error("null serverAddress");
        }

        var url = getUrl($scope.serverAddress, "Sessions/Playing/Stopped");

        broadcastToMessageBus({
            type: 'playbackstop',
            data: getSenderReportingData($scope, options)
        });

        return fetchhelper.ajax({

            url: url,
            headers: getSecurityHeaders($scope.accessToken, $scope.userId),
            type: 'POST',
            data: JSON.stringify(options),
            contentType: 'application/json'
        });
    };

    factory.pingTranscoder = function ($scope, options) {

        if (!$scope.userId) {
            throw new Error("null userId");
        }

        if (!$scope.serverAddress) {
            throw new Error("null serverAddress");
        }

        var now = new Date().getTime();
        if ((now - lastTranscoderPing) < 10000) {

            console.log("Skipping ping due to recent progress check-in");
            return new Promise(function (resolve, reject) {
                resolve();
            });
        }

        var url = getUrl($scope.serverAddress, "Sessions/Playing/Ping");
        lastTranscoderPing = new Date().getTime();

        return fetchhelper.ajax({

            url: url,
            headers: getSecurityHeaders($scope.accessToken, $scope.userId),
            type: 'POST',
            data: JSON.stringify(options),
            contentType: 'application/json'
        });
    };

    var backdropInterval;
    function clearBackropInterval() {
        if (backdropInterval) {
            clearInterval(backdropInterval);
            backdropInterval = null;
        }
    }

    function startBackdropInterval($scope, serverAddress, accessToken, userId) {

        clearBackropInterval();

        setRandomUserBackdrop($scope, serverAddress, accessToken, userId);

        backdropInterval = setInterval(function () {
            setRandomUserBackdrop($scope, serverAddress, accessToken, userId);
        }, 30000);
    }

    function setRandomUserBackdrop($scope, serverAddress, accessToken, userId) {

        console.log('setRandomUserBackdrop');

        var url = getUrl(serverAddress, "Users/" + userId + "/Items");

        fetchhelper.ajax({
            url: url,
            headers: getSecurityHeaders(accessToken, userId),
            dataType: 'json',
            type: 'GET',
            params: {
                SortBy: "Random",
                IncludeItemTypes: "Movie,Series",
                ImageTypes: 'Backdrop',
                Recursive: true,

                // Although we're limiting to what the user has access to,
                // not everyone will want to see adult backdrops rotating on their TV.
                MaxOfficialRating: 'R',

                Limit: 1
            }

        }).then(function (result) {
            var item = result.Items[0];

            var backdropUrl = '';

            if (item) {
                backdropUrl = getBackdropUrl(item, serverAddress) || '';
            }

            $scope.waitingbackdrop = backdropUrl;
        });
    }

    factory.displayUserInfo = function ($scope, serverAddress, accessToken, userId) {

        startBackdropInterval($scope, serverAddress, accessToken, userId);
    };

    factory.stopDynamicContent = function () {
        clearBackropInterval();
    };

    function showItem($scope, serverAddress, accessToken, userId, item) {

        clearBackropInterval();

        console.log('showItem');

        var backdropUrl = getBackdropUrl(item, serverAddress) || '';
        var detailImageUrl = getPrimaryImageUrl(item, serverAddress) || '';

        setTimeout(function () {
            setAppStatus('details');
            $scope.waitingbackdrop = backdropUrl;

            $scope.detailLogoUrl = getLogoUrl(item, serverAddress) || '';
            setOverview(item.Overview || '');
            setGenres(item.Genres.join(' / '));
            setDisplayName(getDisplayName(item));
            document.getElementById('miscInfo').innerHTML = getMiscInfoHtml(item, datetime) || '';
            document.getElementById('detailRating').innerHTML = getRatingHtml(item);

            var playedIndicator = document.getElementById('playedIndicator');

            if (item.UserData.Played) {

                playedIndicator.style.display = 'block';
                playedIndicator.innerHTML = '<span class="glyphicon glyphicon-ok"></span>';
            }
            else if (item.UserData.UnplayedItemCount) {

                playedIndicator.style.display = 'block';
                playedIndicator.innerHTML = item.UserData.UnplayedItemCount;
            }
            else {
                playedIndicator.style.display = 'none';
            }

            if (item.UserData.PlayedPercentage && item.UserData.PlayedPercentage < 100 && !item.IsFolder) {
                $scope.hasPlayedPercentage = false;
                setPlayedPercentage(item.UserData.PlayedPercentage);

                detailImageUrl += "&PercentPlayed=" + parseInt(item.UserData.PlayedPercentage);

            } else {
                $scope.hasPlayedPercentage = false;
                $scope.playedPercentage = 0;
                setPlayedPercentage(0);
            }

            $scope.detailImageUrl = detailImageUrl;

        }, 0);
    }

    factory.displayItem = function ($scope, serverAddress, accessToken, userId, itemId) {

        console.log('Displaying item: ' + itemId);

        var url = getUrl(serverAddress, "Users/" + userId + "/Items/" + itemId);

        fetchhelper.ajax({
            url: url,
            headers: getSecurityHeaders(accessToken, userId),
            dataType: 'json',
            type: 'GET'

        }).then(function (item) {

            showItem($scope, serverAddress, accessToken, userId, item);
        });
    };

    factory.getSubtitle = function ($scope, subtitleStreamUrl) {

        return fetchhelper.ajax({

            url: subtitleStreamUrl,
            headers: getSecurityHeaders($scope.accessToken, $scope.userId),
            type: 'GET',
            dataType: 'json'
        });
    };

    factory.load = function ($scope, customData, serverItem) {

        resetPlaybackScope($scope);

        clearTimeouts();

        extend($scope, customData);

        var data = serverItem;

        $scope.item = data;

        var isSeries = !!data.SeriesName;
        var backdropUrl = '';

        if (data.BackdropImageTags && data.BackdropImageTags.length) {
            backdropUrl = $scope.serverAddress + '/mediabrowser/Items/' + data.Id + '/Images/Backdrop/0?tag=' + data.BackdropImageTags[0];
        } else {
            if (data.ParentBackdropItemId && data.ParentBackdropImageTags && data.ParentBackdropImageTags.length) {
                backdropUrl = $scope.serverAddress + '/mediabrowser/Items/' + data.ParentBackdropItemId + '/Images/Backdrop/0?tag=' + data.ParentBackdropImageTags[0];
            }
        }

        var posterUrl = '';

        if (isSeries && data.SeriesPrimaryImageTag) {
            posterUrl = $scope.serverAddress + '/mediabrowser/Items/' + data.SeriesId + '/Images/Primary?tag=' + data.SeriesPrimaryImageTag;
        }
        else if (data.AlbumPrimaryImageTag) {
            posterUrl = $scope.serverAddress + '/mediabrowser/Items/' + data.AlbumId + '/Images/Primary?tag=' + (data.AlbumPrimaryImageTag);
        }
        else if (data.PrimaryImageTag) {
            posterUrl = $scope.serverAddress + '/mediabrowser/Items/' + data.Id + '/Images/Primary?tag=' + (data.PrimaryImageTag);
        }
        else if (data.ImageTags.Primary) {
            posterUrl = $scope.serverAddress + '/mediabrowser/Items/' + data.Id + '/Images/Primary?tag=' + (data.ImageTags.Primary);
        }

        setPoster(posterUrl);
        fallBackBackdropImg($scope, backdropUrl);
        setMediaTitle(isSeries ? data.SeriesName : data.Name);
        setSecondaryTitle(isSeries ? data.Name : '');

        if (data.MediaType == "Audio" && data.Artists && data.Album) {
            setArtist(data.Artists[0]);
            setAlbumTitle(data.Album);
        }

        setAppStatus('backdrop');
        $scope.mediaType = data.MediaType;

        $scope.detailLogoUrl = getLogoUrl(data, $scope.serverAddress) || '';

        clearTimeouts();
    };

    factory.delayStart = function ($scope) {
        delayStartPromise = setTimeout(function () {

            factory.reportPlaybackStart($scope, getReportingParams($scope)).then(function () {
                window.mediaElement.play();
                setAppStatus('playing-with-controls');
                if ($scope.mediaType == "Audio") {
                    setAppStatus('audio');
                }
                $scope.paused = false;
            });

            setControls($scope);

        }, 1000);
    };

    factory.play = function ($scope, event) {
        $scope.paused = false;

        if ($scope.status == 'backdrop' || $scope.status == 'playing-with-controls' || $scope.status == 'playing' || $scope.status == 'audio') {
            clearTimeouts();
            setTimeout(function () {

                var startTime = new Date();
                window.mediaElement.play();
                window.mediaElement.pause();
                while (typeof (window.mediaElement.buffered) === 'undefined' || window.mediaElement.buffered.length === 0) {
                    if ((new Date()) - startTime > 25000) {
                        setAppStatus('waiting');
                        factory.setApplicationClose();
                        return;
                    }
                }

                window.mediaManager.defaultOnPlay(event);

                setAppStatus('playing-with-controls');
                if ($scope.mediaType == "Audio") {
                    setAppStatus('audio');
                }

            }, 20).then(function () {
                setControls($scope);
            });
        }
    };

    factory.pause = function ($scope) {
        setAppStatus('playing-with-controls');
        if ($scope.mediaType == "Audio") {
            setAppStatus('audio');
        }
        $scope.paused = true;
        $scope.currentTime = window.mediaElement.currentTime;
        clearTimeouts();
    };

    factory.stop = function ($scope) {

        setTimeout(function () {

            clearTimeouts();
            setAppStatus('waiting');
            setApplicationClose();

        }, 20);
    };

    factory.getPlaybackInfo = function (item, maxBitrate, deviceProfile, startPosition, mediaSourceId, audioStreamIndex, subtitleStreamIndex, liveStreamId) {

        if (!item.userId) {
            throw new Error("null userId");
            return;
        }

        if (!item.serverAddress) {
            throw new Error("null serverAddress");
            return;
        }

        var postData = {
            DeviceProfile: deviceProfile
        };

        var query = {
            UserId: item.userId,
            StartTimeTicks: startPosition || 0,
            MaxStreamingBitrate: maxBitrate
        };

        if (audioStreamIndex != null) {
            query.AudioStreamIndex = audioStreamIndex;
        }
        if (subtitleStreamIndex != null) {
            query.SubtitleStreamIndex = subtitleStreamIndex;
        }
        if (mediaSourceId) {
            query.MediaSourceId = mediaSourceId;
        }
        if (liveStreamId) {
            query.LiveStreamId = liveStreamId;
        }

        var url = getUrl(item.serverAddress, 'Items/' + item.Id + '/PlaybackInfo');

        return fetchhelper.ajax({

            url: url,
            headers: getSecurityHeaders(item.accessToken, item.userId),
            query: query,
            type: 'POST',
            dataType: 'json',
            data: JSON.stringify(postData),
            contentType: 'application/json'
        });
    };

    factory.getLiveStream = function (item, playSessionId, maxBitrate, deviceProfile, startPosition, mediaSource, audioStreamIndex, subtitleStreamIndex) {

        if (!item.userId) {
            throw new Error("null userId");
            return;
        }

        if (!item.serverAddress) {
            throw new Error("null serverAddress");
            return;
        }

        var postData = {
            DeviceProfile: deviceProfile,
            OpenToken: mediaSource.OpenToken
        };

        var query = {
            UserId: item.userId,
            StartTimeTicks: startPosition || 0,
            ItemId: item.Id,
            MaxStreamingBitrate: maxBitrate,
            PlaySessionId: playSessionId
        };

        if (audioStreamIndex != null) {
            query.AudioStreamIndex = audioStreamIndex;
        }
        if (subtitleStreamIndex != null) {
            query.SubtitleStreamIndex = subtitleStreamIndex;
        }

        var url = getUrl(item.serverAddress, 'LiveStreams/Open');

        return fetchhelper.ajax({

            url: url,
            headers: getSecurityHeaders(item.accessToken, item.userId),
            query: query,
            type: 'POST',
            dataType: 'json',
            data: JSON.stringify(postData),
            contentType: 'application/json'
        });
    };

    factory.setApplicationClose = setApplicationClose;

    return factory;
});