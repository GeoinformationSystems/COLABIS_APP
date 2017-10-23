
//IMGWMS

ol.source.ImageWMS = function(opt_options) {

  var options = opt_options || {};

  ol.source.Image.call(this, {
    attributions: options.attributions,
    logo: options.logo,
    projection: options.projection,
    resolutions: options.resolutions
  });

  /**
   * @private
   * @type {?string}
   */
  this.crossOrigin_ =
      options.crossOrigin !== undefined ? options.crossOrigin : null;

  /**
   * @private
   * @type {string|undefined}
   */
  this.url_ = options.url;

  /**
   * @private
   * @type {ol.ImageLoadFunctionType}
   */
  this.imageLoadFunction_ = options.imageLoadFunction !== undefined ?
    options.imageLoadFunction : ol.source.Image.defaultImageLoadFunction;

  /**
   * @private
   * @type {!Object}
   */
  this.params_ = options.params || {};

  /**
   * @private
   * @type {boolean}
   */
  this.v13_ = true;
  this.updateV13_();

  /**
   * @private
   * @type {ol.source.WMSServerType|undefined}
   */
  this.serverType_ = /** @type {ol.source.WMSServerType|undefined} */ (options.serverType);

  /**
   * @private
   * @type {boolean}
   */
  this.hidpi_ = options.hidpi !== undefined ? options.hidpi : true;

  /**
   * @private
   * @type {ol.Image}
   */
  this.image_ = null;

  /**
   * @private
   * @type {ol.Size}
   */
  this.imageSize_ = [0, 0];

  /**
   * @private
   * @type {number}
   */
  this.renderedRevision_ = 0;

  /**
   * @private
   * @type {number}
   */
  this.ratio_ = options.ratio !== undefined ? options.ratio : 1.5;

};
ol.inherits(ol.source.ImageWMS, ol.source.Image);


/**
 * @const
 * @type {ol.Size}
 * @private
 */
ol.source.ImageWMS.GETFEATUREINFO_IMAGE_SIZE_ = [101, 101];


/**
 * Return the GetFeatureInfo URL for the passed coordinate, resolution, and
 * projection. Return `undefined` if the GetFeatureInfo URL cannot be
 * constructed.
 * @param {ol.Coordinate} coordinate Coordinate.
 * @param {number} resolution Resolution.
 * @param {ol.ProjectionLike} projection Projection.
 * @param {!Object} params GetFeatureInfo params. `INFO_FORMAT` at least should
 *     be provided. If `QUERY_LAYERS` is not provided then the layers specified
 *     in the `LAYERS` parameter will be used. `VERSION` should not be
 *     specified here.
 * @return {string|undefined} GetFeatureInfo URL.
 * @api
 */
ol.source.ImageWMS.prototype.getGetFeatureInfoUrl = function(coordinate, resolution, projection, params) {
  if (this.url_ === undefined) {
    return undefined;
  }

  var extent = ol.extent.getForViewAndSize(
      coordinate, resolution, 0,
      ol.source.ImageWMS.GETFEATUREINFO_IMAGE_SIZE_);

  var baseParams = {
    'service': 'WMS',
    'version': ol.DEFAULT_WMS_VERSION,
    'request': 'GetFeatureInfo',
    'format': 'image/png',
    'transparent': true,
    'query_layers': this.params_['layers']
  };
  ol.obj.assign(baseParams, this.params_, params);

  var x = Math.floor((coordinate[0] - extent[0]) / resolution);
  var y = Math.floor((extent[3] - coordinate[1]) / resolution);
  baseParams[this.v13_ ? 'I' : 'X'] = x;
  baseParams[this.v13_ ? 'J' : 'Y'] = y;

  return this.getRequestUrl_(
      extent, ol.source.ImageWMS.GETFEATUREINFO_IMAGE_SIZE_,
      1, ol.proj.get(projection), baseParams);
};


/**
 * Get the user-provided params, i.e. those passed to the constructor through
 * the "params" option, and possibly updated using the updateParams method.
 * @return {Object} Params.
 * @api
 */
ol.source.ImageWMS.prototype.getParams = function() {
  return this.params_;
};


/**
 * @inheritDoc
 */
ol.source.ImageWMS.prototype.getImageInternal = function(extent, resolution, pixelRatio, projection) {

  if (this.url_ === undefined) {
    return null;
  }

  resolution = this.findNearestResolution(resolution);

  if (pixelRatio != 1 && (!this.hidpi_ || this.serverType_ === undefined)) {
    pixelRatio = 1;
  }

  var imageResolution = resolution / pixelRatio;

  var center = ol.extent.getCenter(extent);
  var viewWidth = Math.ceil(ol.extent.getWidth(extent) / imageResolution);
  var viewHeight = Math.ceil(ol.extent.getHeight(extent) / imageResolution);
  var viewExtent = ol.extent.getForViewAndSize(center, imageResolution, 0,
      [viewWidth, viewHeight]);
  var requestWidth = Math.ceil(this.ratio_ * ol.extent.getWidth(extent) / imageResolution);
  var requestHeight = Math.ceil(this.ratio_ * ol.extent.getHeight(extent) / imageResolution);
  var requestExtent = ol.extent.getForViewAndSize(center, imageResolution, 0,
      [requestWidth, requestHeight]);

  var image = this.image_;
  if (image &&
      this.renderedRevision_ == this.getRevision() &&
      image.getResolution() == resolution &&
      image.getPixelRatio() == pixelRatio &&
      ol.extent.containsExtent(image.getExtent(), viewExtent)) {
    return image;
  }

  var params = {
    'service': 'WMS',
    'version': ol.DEFAULT_WMS_VERSION,
    'request': 'GetMap',
    'format': 'image/png',
    'transparent': true
  };
  ol.obj.assign(params, this.params_);

  this.imageSize_[0] = Math.round(ol.extent.getWidth(requestExtent) / imageResolution);
  this.imageSize_[1] = Math.round(ol.extent.getHeight(requestExtent) / imageResolution);

  var url = this.getRequestUrl_(requestExtent, this.imageSize_, pixelRatio,
      projection, params);

  this.image_ = new ol.Image(requestExtent, resolution, pixelRatio,
      this.getAttributions(), url, this.crossOrigin_, this.imageLoadFunction_);

  this.renderedRevision_ = this.getRevision();

  ol.events.listen(this.image_, ol.events.EventType.CHANGE,
      this.handleImageChange, this);

  return this.image_;

};


/**
 * Return the image load function of the source.
 * @return {ol.ImageLoadFunctionType} The image load function.
 * @api
 */
ol.source.ImageWMS.prototype.getImageLoadFunction = function() {
  return this.imageLoadFunction_;
};


/**
 * @param {ol.Extent} extent Extent.
 * @param {ol.Size} size Size.
 * @param {number} pixelRatio Pixel ratio.
 * @param {ol.proj.Projection} projection Projection.
 * @param {Object} params Params.
 * @return {string} Request URL.
 * @private
 */
ol.source.ImageWMS.prototype.getRequestUrl_ = function(extent, size, pixelRatio, projection, params) {
  ol.asserts.assert(this.url_ !== undefined, 9); // `url` must be configured or set using `#setUrl()`

  params[this.v13_ ? 'crs' : 'SRS'] = projection.getCode();

  if (!('styles' in this.params_)) {
    params['styles'] = '';
  }

  if (pixelRatio != 1) {
    switch (this.serverType_) {
      case ol.source.WMSServerType.GEOSERVER:
        var dpi = (90 * pixelRatio + 0.5) | 0;
        if ('format_options' in params) {
          params['format_options'] += ';dpi:' + dpi;
        } else {
          params['format_options'] = 'dpi:' + dpi;
        }
        break;
      case ol.source.WMSServerType.MAPSERVER:
        params['map_resolution'] = 90 * pixelRatio;
        break;
      case ol.source.WMSServerType.CARMENTA_SERVER:
      case ol.source.WMSServerType.QGIS:
        params['dpi'] = 90 * pixelRatio;
        break;
      default:
        ol.asserts.assert(false, 8); // Unknown `serverType` configured
        break;
    }
  }

  params['width'] = size[0];
  params['height'] = size[1];

  var axisOrientation = projection.getAxisOrientation();
  var bbox;
  if (this.v13_ && axisOrientation.substr(0, 2) == 'ne') {
    bbox = [extent[1], extent[0], extent[3], extent[2]];
  } else {
    bbox = extent;
  }
  params['bbox'] = bbox.join(',');

  return ol.uri.appendParams(/** @type {string} */ (this.url_), params);
};


/**
 * Return the URL used for this WMS source.
 * @return {string|undefined} URL.
 * @api
 */
ol.source.ImageWMS.prototype.getUrl = function() {
  return this.url_;
};


/**
 * Set the image load function of the source.
 * @param {ol.ImageLoadFunctionType} imageLoadFunction Image load function.
 * @api
 */
ol.source.ImageWMS.prototype.setImageLoadFunction = function(
    imageLoadFunction) {
  this.image_ = null;
  this.imageLoadFunction_ = imageLoadFunction;
  this.changed();
};


/**
 * Set the URL to use for requests.
 * @param {string|undefined} url URL.
 * @api
 */
ol.source.ImageWMS.prototype.setUrl = function(url) {
  if (url != this.url_) {
    this.url_ = url;
    this.image_ = null;
    this.changed();
  }
};


/**
 * Update the user-provided params.
 * @param {Object} params Params.
 * @api
 */
ol.source.ImageWMS.prototype.updateParams = function(params) {
  ol.obj.assign(this.params_, params);
  this.updateV13_();
  this.image_ = null;
  this.changed();
};


/**
 * @private
 */
ol.source.ImageWMS.prototype.updateV13_ = function() {
  var version = this.params_['version'] || ol.DEFAULT_WMS_VERSION;
  this.v13_ = ol.string.compareVersions(version, '1.3') >= 0;
};


// TILEWMS

ol.source.TileWMS = function(opt_options) {

  var options = opt_options || {};

  var params = options.params || {};

  var transparent = 'transparent' in params ? params['transparent'] : true;

  ol.source.TileImage.call(this, {
    attributions: options.attributions,
    cacheSize: options.cacheSize,
    crossOrigin: options.crossOrigin,
    logo: options.logo,
    opaque: !transparent,
    projection: options.projection,
    reprojectionErrorThreshold: options.reprojectionErrorThreshold,
    tileClass: options.tileClass,
    tileGrid: options.tileGrid,
    tileLoadFunction: options.tileLoadFunction,
    url: options.url,
    urls: options.urls,
    wrapX: options.wrapX !== undefined ? options.wrapX : true,
    transition: options.transition
  });

  /**
   * @private
   * @type {number}
   */
  this.gutter_ = options.gutter !== undefined ? options.gutter : 0;

  /**
   * @private
   * @type {!Object}
   */
  this.params_ = params;

  /**
   * @private
   * @type {boolean}
   */
  this.v13_ = true;

  /**
   * @private
   * @type {ol.source.WMSServerType|undefined}
   */
  this.serverType_ = /** @type {ol.source.WMSServerType|undefined} */ (options.serverType);

  /**
   * @private
   * @type {boolean}
   */
  this.hidpi_ = options.hidpi !== undefined ? options.hidpi : true;

  /**
   * @private
   * @type {ol.Extent}
   */
  this.tmpExtent_ = ol.extent.createEmpty();

  this.updateV13_();
  this.setKey(this.getKeyForParams_());

};
ol.inherits(ol.source.TileWMS, ol.source.TileImage);


/**
 * Return the GetFeatureInfo URL for the passed coordinate, resolution, and
 * projection. Return `undefined` if the GetFeatureInfo URL cannot be
 * constructed.
 * @param {ol.Coordinate} coordinate Coordinate.
 * @param {number} resolution Resolution.
 * @param {ol.ProjectionLike} projection Projection.
 * @param {!Object} params GetFeatureInfo params. `INFO_FORMAT` at least should
 *     be provided. If `QUERY_LAYERS` is not provided then the layers specified
 *     in the `LAYERS` parameter will be used. `VERSION` should not be
 *     specified here.
 * @return {string|undefined} GetFeatureInfo URL.
 * @api
 */
ol.source.TileWMS.prototype.getGetFeatureInfoUrl = function(coordinate, resolution, projection, params) {
  var projectionObj = ol.proj.get(projection);

  var tileGrid = this.getTileGrid();
  if (!tileGrid) {
    tileGrid = this.getTileGridForProjection(projectionObj);
  }

  var tileCoord = tileGrid.getTileCoordForCoordAndResolution(
      coordinate, resolution);

  if (tileGrid.getResolutions().length <= tileCoord[0]) {
    return undefined;
  }

  var tileResolution = tileGrid.getResolution(tileCoord[0]);
  var tileExtent = tileGrid.getTileCoordExtent(tileCoord, this.tmpExtent_);
  var tileSize = ol.size.toSize(
      tileGrid.getTileSize(tileCoord[0]), this.tmpSize);

  var gutter = this.gutter_;
  if (gutter !== 0) {
    tileSize = ol.size.buffer(tileSize, gutter, this.tmpSize);
    tileExtent = ol.extent.buffer(tileExtent,
        tileResolution * gutter, tileExtent);
  }

  var baseParams = {
    'servive': 'WMS',
    'version': ol.DEFAULT_WMS_VERSION,
    'request': 'GetFeatureInfo',
    'format': 'image/png',
    'transparent': true,
    'query_layers': this.params_['layers']
  };
  ol.obj.assign(baseParams, this.params_, params);

  var x = Math.floor((coordinate[0] - tileExtent[0]) / tileResolution);
  var y = Math.floor((tileExtent[3] - coordinate[1]) / tileResolution);

  baseParams[this.v13_ ? 'I' : 'X'] = x;
  baseParams[this.v13_ ? 'J' : 'Y'] = y;
  
  return this.getRequestUrl_(tileCoord, tileSize, tileExtent,
      1, projectionObj, baseParams);
};


/**
 * @inheritDoc
 */
ol.source.TileWMS.prototype.getGutterInternal = function() {
  return this.gutter_;
};


/**
 * Get the user-provided params, i.e. those passed to the constructor through
 * the "params" option, and possibly updated using the updateParams method.
 * @return {Object} Params.
 * @api
 */
ol.source.TileWMS.prototype.getParams = function() {
  return this.params_;
};


/**
 * @param {ol.TileCoord} tileCoord Tile coordinate.
 * @param {ol.Size} tileSize Tile size.
 * @param {ol.Extent} tileExtent Tile extent.
 * @param {number} pixelRatio Pixel ratio.
 * @param {ol.proj.Projection} projection Projection.
 * @param {Object} params Params.
 * @return {string|undefined} Request URL.
 * @private
 */
ol.source.TileWMS.prototype.getRequestUrl_ = function(tileCoord, tileSize, tileExtent,
    pixelRatio, projection, params) {

  var urls = this.urls;
  if (!urls) {
    return undefined;
  }

  params['width'] = tileSize[0];
  params['height'] = tileSize[1];

  params[this.v13_ ? 'crs' : 'SRS'] = projection.getCode();

  if (!('styles' in this.params_)) {
    params['styles'] = '';
  }

  if (pixelRatio != 1) {
    switch (this.serverType_) {
      case ol.source.WMSServerType.GEOSERVER:
        var dpi = (90 * pixelRatio + 0.5) | 0;
        if ('format_options' in params) {
          params['format_options'] += ';dpi:' + dpi;
        } else {
          params['format_options'] = 'dpi:' + dpi;
        }
        break;
      case ol.source.WMSServerType.MAPSERVER:
        params['map_resolution'] = 90 * pixelRatio;
        break;
      case ol.source.WMSServerType.CARMENTA_SERVER:
      case ol.source.WMSServerType.QGIS:
        params['dpi'] = 90 * pixelRatio;
        break;
      default:
        ol.asserts.assert(false, 52); // Unknown `serverType` configured
        break;
    }
  }

  var axisOrientation = projection.getAxisOrientation();
  var bbox = tileExtent;
  if (this.v13_ && axisOrientation.substr(0, 2) == 'ne') {
    var tmp;
    tmp = tileExtent[0];
    bbox[0] = tileExtent[1];
    bbox[1] = tmp;
    tmp = tileExtent[2];
    bbox[2] = tileExtent[3];
    bbox[3] = tmp;
  }
  params['bbox'] = bbox.join(',');

  var url;
  if (urls.length == 1) {
    url = urls[0];
  } else {
    var index = ol.math.modulo(ol.tilecoord.hash(tileCoord), urls.length);
    url = urls[index];
  }
  return ol.uri.appendParams(url, params);
};


/**
 * @inheritDoc
 */
ol.source.TileWMS.prototype.getTilePixelRatio = function(pixelRatio) {
  return (!this.hidpi_ || this.serverType_ === undefined) ? 1 :
  /** @type {number} */ (pixelRatio);
};


/**
 * @private
 * @return {string} The key for the current params.
 */
ol.source.TileWMS.prototype.getKeyForParams_ = function() {
  var i = 0;
  var res = [];
  for (var key in this.params_) {
    res[i++] = key + '-' + this.params_[key];
  }
  return res.join('/');
};


/**
 * @inheritDoc
 */
ol.source.TileWMS.prototype.fixedTileUrlFunction = function(tileCoord, pixelRatio, projection) {

  var tileGrid = this.getTileGrid();
  if (!tileGrid) {
    tileGrid = this.getTileGridForProjection(projection);
  }

  if (tileGrid.getResolutions().length <= tileCoord[0]) {
    return undefined;
  }

  if (pixelRatio != 1 && (!this.hidpi_ || this.serverType_ === undefined)) {
    pixelRatio = 1;
  }

  var tileResolution = tileGrid.getResolution(tileCoord[0]);
  var tileExtent = tileGrid.getTileCoordExtent(tileCoord, this.tmpExtent_);
  var tileSize = ol.size.toSize(
      tileGrid.getTileSize(tileCoord[0]), this.tmpSize);

  var gutter = this.gutter_;
  if (gutter !== 0) {
    tileSize = ol.size.buffer(tileSize, gutter, this.tmpSize);
    tileExtent = ol.extent.buffer(tileExtent,
        tileResolution * gutter, tileExtent);
  }

  if (pixelRatio != 1) {
    tileSize = ol.size.scale(tileSize, pixelRatio, this.tmpSize);
  }

  var baseParams = {
    'service': 'WMS',
    'version': ol.DEFAULT_WMS_VERSION,
    'request': 'GetMap',
    'format': 'image/png',
    'transparent': true
  };
  ol.obj.assign(baseParams, this.params_);

  return this.getRequestUrl_(tileCoord, tileSize, tileExtent,
      pixelRatio, projection, baseParams);
};

/**
 * Update the user-provided params.
 * @param {Object} params Params.
 * @api
 */
ol.source.TileWMS.prototype.updateParams = function(params) {
  ol.obj.assign(this.params_, params);
  this.updateV13_();
  this.setKey(this.getKeyForParams_());
};


/**
 * @private
 */
ol.source.TileWMS.prototype.updateV13_ = function() {
  var version = this.params_['version'] || ol.DEFAULT_WMS_VERSION;
  this.v13_ = ol.string.compareVersions(version, '1.3') >= 0;
};

