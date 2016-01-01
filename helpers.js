function getUrl(serverAddress, name) {

    if (!name) {
        throw new Error("Url name cannot be empty");
    }

    var url = serverAddress;

    if (name.charAt(0) != '/') {
        url += '/';
    }

    url += name;

    return url;
}

var canPlayFlac = document.createElement('audio').canPlayType('audio/flac').replace(/no/, '');

function getDeviceProfile() {

    var profile = {};

    profile.MaxStreamingBitrate = DefaultMaxBitrate;
    profile.MaxStaticBitrate = DefaultMaxBitrate;
    profile.MusicStreamingTranscodingBitrate = 192000;

    var videoAudioCodecs = "aac,mp3";

    if (window.playOptions.supportsAc3) {
        videoAudioCodecs += ",ac3";
    }

    profile.DirectPlayProfiles = [];
    profile.DirectPlayProfiles.push({
        Container: 'mp4,mkv,m4v',
        Type: 'Video',
        VideoCodec: 'h264',
        AudioCodec: videoAudioCodecs
    });

    profile.DirectPlayProfiles.push({
        Container: 'webm',
        Type: 'Video'
    });

    var audioFormats = 'mp3,aac,webm,webma';

    if (canPlayFlac) {
        audioFormats += ',flac';
    }

    profile.DirectPlayProfiles.push({
        Container: audioFormats,
        Type: 'Audio'
    });

    profile.TranscodingProfiles = [];
    profile.TranscodingProfiles.push({
        Container: 'mp3',
        Type: 'Audio',
        AudioCodec: 'mp3',
        Context: 'Streaming',
        Protocol: 'http'
    });

    profile.TranscodingProfiles.push({
        Container: 'ts',
        Type: 'Video',
        AudioCodec: 'mp3',
        VideoCodec: 'h264',
        Context: 'Streaming',
        Protocol: 'hls'
    });

    profile.ContainerProfiles = [];

    profile.CodecProfiles = [];
    profile.CodecProfiles.push({
        Type: 'Audio',
        Conditions: [{
            Condition: 'LessThanEqual',
            Property: 'AudioChannels',
            Value: '2',
            IsRequired: true
        }]
    });

    profile.CodecProfiles.push({
        Type: 'VideoAudio',
        Codec: 'aac,mp3',
        Conditions: [{
            Condition: 'LessThanEqual',
            Property: 'AudioChannels',
            Value: '2',
            IsRequired: true
        }]
    });

    profile.CodecProfiles.push({
        Type: 'VideoAudio',
        Codec: 'ac3',
        Conditions: [{
            Condition: 'LessThanEqual',
            Property: 'AudioChannels',
            Value: '6',
            IsRequired: false
        }]
    });

    profile.CodecProfiles.push({
        Type: 'Video',
        Codec: 'h264',
        Conditions: [
        {
            Condition: 'NotEquals',
            Property: 'IsAnamorphic',
            Value: 'true',
            IsRequired: false
        },
        {
            Condition: 'EqualsAny',
            Property: 'VideoProfile',
            Value: 'high|main|baseline|constrained baseline',
            IsRequired: false
        },
        {
            Condition: 'LessThanEqual',
            Property: 'VideoLevel',
            Value: '41',
            IsRequired: false
        },
        {
            Condition: 'LessThanEqual',
            Property: 'Width',
            Value: "1920",
            IsRequired: true
        },
        {
            Condition: 'LessThanEqual',
            Property: 'Height',
            Value: "1080",
            IsRequired: true
        }]
    });

    // Subtitle profiles
    // External vtt
    profile.SubtitleProfiles = [];
    profile.SubtitleProfiles.push({
        Format: 'js',
        Method: 'External'
    });

    return profile;
}

function getReportingParams($scope) {

    var positionTicks = window.mediaElement.currentTime * 10000000;

    if (!$scope.canClientSeek) {

        positionTicks += ($scope.startPositionTicks || 0);
    }

    return {
        PositionTicks: positionTicks,
        IsPaused: window.mediaElement.paused,
        IsMuted: window.VolumeInfo.IsMuted,
        AudioStreamIndex: $scope.audioStreamIndex,
        SubtitleStreamIndex: $scope.subtitleStreamIndex,
        VolumeLevel: window.VolumeInfo.Level,
        ItemId: $scope.itemId,
        MediaSourceId: $scope.mediaSourceId,
        QueueableMediaTypes: ['Audio', 'Video'],
        CanSeek: $scope.canSeek,
        PlayMethod: $scope.playMethod,
        LiveStreamId: $scope.liveStreamId,
        PlaySessionId: $scope.playSessionId,
        RepeatMode: window.repeatMode
    };
}

function getSenderReportingData($scope, reportingData) {

    var state = {
        ItemId: reportingData.ItemId,
        PlayState: angular.extend({}, reportingData),
        QueueableMediaTypes: reportingData.QueueableMediaTypes
    };

    // Don't want this here
    state.PlayState.QueueableMediaTypes = null;
    delete state.PlayState.QueueableMediaTypes;
    state.PlayState.ItemId = null;
    delete state.PlayState.ItemId;

    state.NowPlayingItem = {

        Id: reportingData.ItemId,
        RunTimeTicks: $scope.runtimeTicks
    };

    var item = $scope.item;

    if (item) {

        var nowPlayingItem = state.NowPlayingItem;

        nowPlayingItem.Chapters = item.Chapters || [];

        // TODO: Fill these
        var mediaSource = item.MediaSources.filter(function (m) {
            return m.Id == reportingData.MediaSourceId;
        })[0];

        nowPlayingItem.MediaStreams = mediaSource ? mediaSource.MediaStreams : [];

        nowPlayingItem.MediaType = item.MediaType;
        nowPlayingItem.Type = item.Type;
        nowPlayingItem.Name = item.Name;

        nowPlayingItem.IndexNumber = item.IndexNumber;
        nowPlayingItem.IndexNumberEnd = item.IndexNumberEnd;
        nowPlayingItem.ParentIndexNumber = item.ParentIndexNumber;
        nowPlayingItem.ProductionYear = item.ProductionYear;
        nowPlayingItem.PremiereDate = item.PremiereDate;
        nowPlayingItem.SeriesName = item.SeriesName;
        nowPlayingItem.Album = item.Album;
        nowPlayingItem.Artists = item.Artists;

        var imageTags = item.ImageTags || {};

        if (item.SeriesPrimaryImageTag) {

            nowPlayingItem.PrimaryImageItemId = item.SeriesId;
            nowPlayingItem.PrimaryImageTag = item.SeriesPrimaryImageTag;
        }
        else if (imageTags.Primary) {

            nowPlayingItem.PrimaryImageItemId = item.Id;
            nowPlayingItem.PrimaryImageTag = imageTags.Primary;
        }
        else if (item.AlbumPrimaryImageTag) {

            nowPlayingItem.PrimaryImageItemId = item.AlbumId;
            nowPlayingItem.PrimaryImageTag = item.AlbumPrimaryImageTag;
        }
        else if (item.SeriesPrimaryImageTag) {

            nowPlayingItem.PrimaryImageItemId = item.SeriesId;
            nowPlayingItem.PrimaryImageTag = item.SeriesPrimaryImageTag;
        }

        if (item.BackdropImageTags && item.BackdropImageTags.length) {

            nowPlayingItem.BackdropItemId = item.Id;
            nowPlayingItem.BackdropImageTag = item.BackdropImageTags[0];
        }

        if (imageTags.Thumb) {

            nowPlayingItem.ThumbItemId = item.Id;
            nowPlayingItem.ThumbImageTag = imageTags.Thumb;
        }

        if (imageTags.Logo) {

            nowPlayingItem.LogoItemId = item.Id;
            nowPlayingItem.LogoImageTag = imageTags.Logo;
        }
        else if (item.ParentLogoImageTag) {

            nowPlayingItem.LogoItemId = item.ParentLogoItemId;
            nowPlayingItem.LogoImageTag = item.ParentLogoImageTag;
        }
    }

    return state;
}

function resetPlaybackScope($scope) {
    setAppStatus('waiting');

    $scope.startPositionTicks = 0;
    $scope.runtimeTicks = 0;
    $scope.poster = '';
    $scope.backdrop = '';
    $scope.waitingbackdrop = '';
    $scope.mediaTitle = '';
    $scope.secondaryTitle = '';
    $scope.currentTime = 0;
    $scope.mediaType = '';
    $scope.itemId = '';
    $scope.artist = '';
    $scope.albumTitle = '';

    $scope.audioStreamIndex = null;
    $scope.subtitleStreamIndex = null;
    $scope.mediaSourceId = '';
    $scope.PlaybackMediaSource = null;

    $scope.showPoster = false;

    $scope.playMethod = '';
    $scope.canSeek = false;
    $scope.canClientSeek = false;

    $scope.item = null;
    $scope.liveStreamId = '';
    $scope.playSessionId = '';

    // Detail content
    $scope.detailLogoUrl = '';
    $scope.detailImageUrl = '';
    $scope.overview = '';
    $scope.genres = '';
    $scope.displayName = '';
    document.getElementById('miscInfo').innerHTML = '';
    document.getElementById('playedIndicator').style.display = 'none';
    $scope.hasPlayedPercentage = false;
    $scope.playedPercentage = 0;
}

function setMetadata(item, metadata, datetime) {

    if (item.Type == 'Episode') {

        //metadata.type = chrome.cast.media.MetadataType.TV_SHOW;

        metadata.episodeTitle = item.Name;

        if (item.PremiereDate) {
            metadata.originalAirdate = datetime.parseISO8601Date(item.PremiereDate).toISOString();
        }

        metadata.seriesTitle = item.SeriesName;

        if (item.IndexNumber != null) {
            metadata.episode = metadata.episodeNumber = item.IndexNumber;
        }

        if (item.ParentIndexNumber != null) {
            metadata.season = metadata.seasonNumber = item.ParentIndexNumber;
        }
    }

    else if (item.Type == 'Photo') {

        //metadata.type = chrome.cast.media.MetadataType.PHOTO;

        if (item.PremiereDate) {
            metadata.creationDateTime = datetime.parseISO8601Date(item.PremiereDate).toISOString();
        }
    }

    else if (item.MediaType == 'Audio') {

        //metadata.type = chrome.cast.media.MetadataType.MUSIC_TRACK;

        if (item.ProductionYear) {
            metadata.releaseYear = item.ProductionYear;
        }

        if (item.PremiereDate) {
            metadata.releaseDate = datetime.parseISO8601Date(item.PremiereDate).toISOString();
        }

        metadata.songName = item.Name;
        metadata.artist = item.Artists & item.Artists.length ? item.Artists[0] : '';
        metadata.albumArtist = item.AlbumArtist;

        if (item.IndexNumber != null) {
            metadata.trackNumber = item.IndexNumber;
        }

        if (item.ParentIndexNumber != null) {
            metadata.discNumber = item.ParentIndexNumber;
        }

        var composer = (item.People || []).filter(function (p) {
            return p.PersonType == 'Type';
        })[0];

        if (composer) {
            metadata.composer = composer.Name;
        }
    }

    else if (item.MediaType == 'Movie') {

        //metadata.type = chrome.cast.media.MetadataType.MOVIE;

        if (item.ProductionYear) {
            metadata.releaseYear = item.ProductionYear;
        }

        if (item.PremiereDate) {
            metadata.releaseDate = parseISO8601Date(item.PremiereDate).toISOString();
        }
    }

    else {

        //metadata.type = chrome.cast.media.MetadataType.GENERIC;

        if (item.ProductionYear) {
            metadata.releaseYear = item.ProductionYear;
        }

        if (item.PremiereDate) {
            metadata.releaseDate = parseISO8601Date(item.PremiereDate).toISOString();
        }
    }

    metadata.title = item.Name;

    if (item.Studios && item.Studios.length) {
        metadata.Studio = item.Studios[0];
    }

    return metadata;
}

function createStreamInfo(item, mediaSource, startPosition) {

    var mediaUrl;
    var contentType;

    var startPositionInSeekParam = startPosition ? (startPosition / 10000000) : 0;
    var seekParam = startPositionInSeekParam ? '#t=' + startPositionInSeekParam : '';

    var isStatic = false;
    var streamContainer = mediaSource.Container;

    var playerStartPositionTicks = 0;

    var type = item.MediaType.toLowerCase();

    if (type == 'video') {

        contentType = 'video/' + mediaSource.Container;

        if (mediaSource.enableDirectPlay) {
            mediaUrl = mediaSource.Path;
            isStatic = true;
        } else {

            if (mediaSource.SupportsDirectStream) {

                mediaUrl = getUrl(item.serverAddress, 'Videos/' + item.Id + '/stream.' + mediaSource.Container);
                mediaUrl += "?mediaSourceId=" + mediaSource.Id;
                mediaUrl += "&api_key=" + item.accessToken;
                mediaUrl += "&static=true" + seekParam;
                isStatic = true;

            } else {

                mediaUrl = getUrl(item.serverAddress, mediaSource.TranscodingUrl);

                if (mediaSource.TranscodingSubProtocol == 'hls') {

                    mediaUrl += seekParam;
                    playerStartPositionTicks = startPosition || 0;
                    contentType = 'application/x-mpegURL';
                    streamContainer = 'm3u8';
                } else {

                    contentType = 'video/' + mediaSource.TranscodingContainer;
                    streamContainer = mediaSource.TranscodingContainer;
                }
            }
        }

    } else {

        contentType = 'audio/' + mediaSource.Container;

        if (mediaSource.enableDirectPlay) {

            mediaUrl = mediaSource.Path;
            isStatic = true;

        } else {

            var isDirectStream = mediaSource.SupportsDirectStream;

            if (isDirectStream) {

                var outputContainer = (mediaSource.Container || '').toLowerCase();

                mediaUrl = getUrl(item.serverAddress, 'Audio/' + item.Id + '/stream.' + outputContainer);
                mediaUrl += "?mediaSourceId=" + mediaSource.Id;
                mediaUrl += "&api_key=" + item.accessToken;
                mediaUrl += "&static=true" + seekParam;
                isStatic = true;

            } else {

                streamContainer = mediaSource.TranscodingContainer;
                contentType = 'audio/' + mediaSource.TranscodingContainer;

                mediaUrl = getUrl(item.serverAddress, mediaSource.TranscodingUrl);
            }
        }
    }

    // TODO: Remove the second half of the expression by supporting changing the mediaElement src dynamically.
    // It is a pain and will require unbinding all event handlers during the operation
    var canSeek = (mediaSource.RunTimeTicks || 0) > 0 && (isStatic || streamContainer == 'm3u8');

    var info = {
        url: mediaUrl,
        mediaSource: mediaSource,
        isStatic: isStatic,
        contentType: contentType,
        streamContainer: streamContainer,
        canSeek: canSeek,
        canClientSeek: isStatic || (canSeek && streamContainer == 'm3u8'),
        audioStreamIndex: mediaSource.DefaultAudioStreamIndex,
        subtitleStreamIndex: mediaSource.DefaultSubtitleStreamIndex,
        playerStartPositionTicks: playerStartPositionTicks
    };

    if (info.subtitleStreamIndex != null) {

        var subtitleStream = getStreamByIndex(mediaSource.MediaStreams, 'Subtitle', info.subtitleStreamIndex);
        if (subtitleStream && subtitleStream.DeliveryMethod == 'External') {

            var textStreamUrl = subtitleStream.IsExternalUrl ? subtitleStream.DeliveryUrl : (getUrl(item.serverAddress, subtitleStream.DeliveryUrl));

            info.subtitleStreamUrl = textStreamUrl;
            console.log('Subtitle url: ' + info.subtitleStreamUrl);
        }
    }

    return info;
}

function getStreamByIndex(streams, type, index) {
    return streams.filter(function (s) {

        return s.Type == type && s.Index == index;

    })[0];
}

function updateTimeOfDay() {

    var now = new Date();

    var time = now.toLocaleTimeString().toLowerCase();

    var text = time.split(':');
    var suffix = '';

    if (text.length == 3) {

        // Fix for toLocaleTimeString returning wrong hour
        if (time.indexOf('pm') != -1 || time.indexOf('am') != -1) {
            text[0] = (now.getHours() % 12) || 12;
        }

        text = text[0] + ':' + text[1];

        if (time.indexOf('pm') != -1) {
            suffix = 'pm';
        }
        else if (time.indexOf('am') != -1) {
            suffix = 'am';
        }

        time = text;
    }

    document.querySelector('.timePrefix').innerHTML = time;
    document.querySelector('.timeSuffix').innerHTML = suffix;
}

function getSecurityHeaders(accessToken, userId) {

    var auth = 'MediaBrowser Client="Chromecast", Device="' + deviceInfo.deviceName + '", DeviceId="' + deviceInfo.deviceId + '", Version="' + deviceInfo.versionNumber + '"';

    if (userId) {
        auth += ', UserId="' + userId + '"';
    }

    var headers = {
        Authorization: auth
    }

    headers["X-MediaBrowser-Token"] = accessToken;

    return headers;
}

function getBackdropUrl(item, serverAddress) {

    var url;

    if (item.BackdropImageTags && item.BackdropImageTags.length) {
        url = getUrl(serverAddress, 'Items/' + item.Id + '/Images/Backdrop/0?tag=' + item.BackdropImageTags[0]);
    } else if (item.ParentBackdropItemId && item.ParentBackdropImageTags && item.ParentBackdropImageTags.length) {
        url = getUrl(serverAddress, 'Items/' + item.ParentBackdropItemId + '/Images/Backdrop/0?tag=' + item.ParentBackdropImageTags[0]);
    }

    return url;
}

function getLogoUrl(item, serverAddress) {

    var url;

    if (item.ImageTags && item.ImageTags.Logo) {
        url = getUrl(serverAddress, 'Items/' + item.Id + '/Images/Logo/0?tag=' + item.ImageTags.Logo);
    } else if (item.ParentLogoItemId && item.ParentLogoImageTag) {
        url = getUrl(serverAddress, 'Items/' + item.ParentLogoItemId + '/Images/Logo/0?tag=' + item.ParentLogoImageTag);
    }

    return url;
}

function getPrimaryImageUrl(item, serverAddress) {

    var posterUrl = '';

    if (item.AlbumPrimaryImageTag) {
        posterUrl = getUrl(serverAddress, 'Items/' + item.AlbumId + '/Images/Primary?tag=' + (item.AlbumPrimaryImageTag));
    }
    else if (item.PrimaryImageTag) {
        posterUrl = getUrl(serverAddress, 'Items/' + item.Id + '/Images/Primary?tag=' + (item.PrimaryImageTag));
    }
    else if (item.ImageTags.Primary) {
        posterUrl = getUrl(serverAddress, 'Items/' + item.Id + '/Images/Primary?tag=' + (item.ImageTags.Primary));
    }

    return posterUrl;
}

function getDisplayName(item) {
    var name = item.EpisodeTitle || item.Name;

    if (item.Type == "TvChannel") {

        if (item.Number) {
            return item.Number + ' ' + name;
        }
        return name;
    }

    if (item.Type == "Episode" && item.IndexNumber != null && item.ParentIndexNumber != null) {

        var displayIndexNumber = item.IndexNumber;

        var number = "E" + displayIndexNumber;

        number = "S" + item.ParentIndexNumber + ", " + number;

        if (item.IndexNumberEnd) {

            displayIndexNumber = item.IndexNumberEnd;
            number += "-" + displayIndexNumber;
        }

        name = number + " - " + name;
    }

    return name;
}

function getRatingHtml(item) {
    var html = "";

    if (item.CommunityRating) {

        html += "<div class='starRating' title='" + item.CommunityRating + "'></div>";
        html += '<div class="starRatingValue">';
        html += item.CommunityRating.toFixed(1);
        html += '</div>';
    }

    if (item.CriticRating != null) {

        if (item.CriticRating >= 60) {
            html += '<div class="fresh rottentomatoesicon" title="fresh"></div>';
        } else {
            html += '<div class="rotten rottentomatoesicon" title="rotten"></div>';
        }

        html += '<div class="criticRating">' + item.CriticRating + '%</div>';
    }

    //if (item.Metascore && metascore !== false) {

    //    if (item.Metascore >= 60) {
    //        html += '<div class="metascore metascorehigh" title="Metascore">' + item.Metascore + '</div>';
    //    }
    //    else if (item.Metascore >= 40) {
    //        html += '<div class="metascore metascoremid" title="Metascore">' + item.Metascore + '</div>';
    //    } else {
    //        html += '<div class="metascore metascorelow" title="Metascore">' + item.Metascore + '</div>';
    //    }
    //}

    return html;
}

var requiredItemFields = "MediaSources,Chapters";

function getShuffleItems(serverAddress, accessToken, userId, item) {

    var query = {
        UserId: userId,
        Fields: requiredItemFields,
        Limit: 50,
        Filters: "IsNotFolder",
        Recursive: true,
        SortBy: "Random"
    };

    if (item.Type == "MusicArtist") {

        query.MediaTypes = "Audio";
        query.ArtistIds = item.Id;

    }
    else if (item.Type == "MusicGenre") {

        query.MediaTypes = "Audio";
        query.Genres = item.Name;

    }
    else {
        query.ParentId = item.Id;
    }

    return getItemsForPlayback(serverAddress, accessToken, userId, query);
}

function getInstantMixItems(serverAddress, accessToken, userId, item) {

    var query = {
        UserId: userId,
        Fields: requiredItemFields,
        Limit: 50
    };

    var url;

    if (item.Type == "MusicArtist") {

        url = "Artists/InstantMix";
        query.Id = item.Id;

    }
    else if (item.Type == "MusicGenre") {

        url = "MusicGenres/InstantMix";
        query.Id = item.Id;

    }
    else if (item.Type == "MusicAlbum") {

        url = "Albums/" + item.Id + "/InstantMix";

    }
    else if (item.Type == "Audio") {

        url = "Songs/" + item.Id + "/InstantMix";
    }
    else if (item.Type == "Playlist") {

        url = "Playlists/" + item.Id + "/InstantMix";
    }

    url = getUrl(serverAddress, url);

    return fetchhelper.ajax({

        url: url,
        headers: getSecurityHeaders(accessToken, userId),
        query: query,
        type: 'GET',
        dataType: 'json'
    });
}

function getItemsForPlayback(serverAddress, accessToken, userId, query) {

    query.UserId = userId;
    query.Limit = query.Limit || 100;
    query.Fields = requiredItemFields;
    query.ExcludeLocationTypes = "Virtual";

    var url = getUrl(serverAddress, "Users/" + userId + "/Items");

    return fetchhelper.ajax({

        url: url,
        headers: getSecurityHeaders(accessToken, userId),
        query: query,
        type: 'GET',
        dataType: 'json'
    });
}

function getIntros(serverAddress, accessToken, userId, firstItem) {

    var url = getUrl(serverAddress, 'Users/' + userId + '/Items/' + firstItem.Id + '/Intros');

    return fetchhelper.ajax({
        url: url,
        dataType: 'json',
        headers: getSecurityHeaders(accessToken, userId),
        type: 'GET'
    });
}

function translateRequestedItems(serverAddress, accessToken, userId, items) {

    var firstItem = items[0];

    if (firstItem.Type == "Playlist") {

        return getItemsForPlayback(serverAddress, accessToken, userId, {
            ParentId: firstItem.Id
        });

    } else if (firstItem.Type == "MusicArtist") {

        return getItemsForPlayback(serverAddress, accessToken, userId, {
            ArtistIds: firstItem.Id,
            Filters: "IsNotFolder",
            Recursive: true,
            SortBy: "SortName",
            MediaTypes: "Audio"
        });

    } else if (firstItem.Type == "MusicGenre") {

        return getItemsForPlayback(serverAddress, accessToken, userId, {
            Genres: firstItem.Name,
            Filters: "IsNotFolder",
            Recursive: true,
            SortBy: "SortName",
            MediaTypes: "Audio"
        });

    } else if (firstItem.IsFolder) {

        return getItemsForPlayback(serverAddress, accessToken, userId, {
            ParentId: firstItem.Id,
            Filters: "IsNotFolder",
            Recursive: true,
            SortBy: "SortName",
            MediaTypes: "Audio,Video"
        });
    }

    return new Promise(function (resolve, reject) {

        resolve({ Items: items });
    });
}

function getMiscInfoHtml(item, datetime) {

    var miscInfo = [];
    var text, date;

    if (item.Type == "Episode") {

        if (item.PremiereDate) {

            try {
                date = datetime.parseISO8601Date(item.PremiereDate);

                text = date.toLocaleDateString();
                miscInfo.push(text);
            }
            catch (e) {
                console.log("Error parsing date: " + item.PremiereDate);
            }
        }
    }

    if (item.StartDate) {

        try {
            date = datetime.parseISO8601Date(item.StartDate);

            text = date.toLocaleDateString();
            miscInfo.push(text);

            if (item.Type != "Recording") {
                //text = LiveTvHelpers.getDisplayTime(date);
                //miscInfo.push(text);
            }
        }
        catch (e) {
            console.log("Error parsing date: " + item.PremiereDate);
        }
    }

    if (item.ProductionYear && item.Type == "Series") {

        if (item.Status == "Continuing") {
            miscInfo.push(item.ProductionYear + "-Present");

        }
        else if (item.ProductionYear) {

            text = item.ProductionYear;

            if (item.EndDate) {

                try {

                    var endYear = datetime.parseISO8601Date(item.EndDate).getFullYear();

                    if (endYear != item.ProductionYear) {
                        text += "-" + datetime.parseISO8601Date(item.EndDate).getFullYear();
                    }

                }
                catch (e) {
                    console.log("Error parsing date: " + item.EndDate);
                }
            }

            miscInfo.push(text);
        }
    }

    if (item.Type != "Series" && item.Type != "Episode") {

        if (item.ProductionYear) {

            miscInfo.push(item.ProductionYear);
        }
        else if (item.PremiereDate) {

            try {
                text = datetime.parseISO8601Date(item.PremiereDate).getFullYear();
                miscInfo.push(text);
            }
            catch (e) {
                console.log("Error parsing date: " + item.PremiereDate);
            }
        }
    }

    var minutes;

    if (item.RunTimeTicks && item.Type != "Series") {

        if (item.Type == "Audio") {

            miscInfo.push(datetime.getDisplayRunningTime(item.RunTimeTicks));

        } else {
            minutes = item.RunTimeTicks / 600000000;

            minutes = minutes || 1;

            miscInfo.push(Math.round(minutes) + "min");
        }
    }

    if (item.OfficialRating && item.Type !== "Season" && item.Type !== "Episode") {
        miscInfo.push(item.OfficialRating);
    }

    if (item.Video3DFormat) {
        miscInfo.push("3D");
    }

    return miscInfo.join('&nbsp;&nbsp;&nbsp;&nbsp;');
}

function setAppStatus(status) {
    $scope.status = status;
    document.body.className = status;
}
function extend(target, source) {
    for (var i in source) {
        target[i] = source[i];
    }
}