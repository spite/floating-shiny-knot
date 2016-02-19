var GSVPANO = GSVPANO || {};
GSVPANO.PanoLoader = function ( parameters ) {

	var _parameters = parameters;
	var _zoom = 3;
	var _location;
	var _panoId;
	var _renderer, _stitcher;
	var rotation = 0;
	var copyright = '';
	var _panoClient = new google.maps.StreetViewService();
	var onSizeChange = null;
	var onPanoramaLoad = null;
	var _canvas = null;
	var _ctx;
	var _count = 0,
		_total = 0;
	
	if( _parameters.useWebGL ) {
		_renderer = new THREE.WebGLRenderer();
		_renderer.autoClearColor = false;
	} else {
		_canvas = document.createElement( 'canvas' );
		_ctx = _canvas.getContext( '2d' );
	}
	
	this.setProgress = function( p ) {
		if( this.onProgress ) this.onProgress( p );
	}
	
	this.throwError = function( message ) {
		if( this.onError ) this.onError( message );
		else console.error( message );
	}
	
	this.adaptTextureToZoom = function() {
		
		var w = 416 * Math.pow( 2, _zoom );
		var h = ( 416 * Math.pow( 2, _zoom - 1 ) );
		if( _parameters.useWebGL ) {
			_stitcher = new GLStitcher( _renderer, w, h, true, true);
			if( this.onSizeChange ) this.onSizeChange();
		} else {
			_canvas.width = w;
			_canvas.height = h;
		}
		
	};
	
	this.composeFromTile = function( x, y, texture ) {

		if( _parameters.useWebGL ) {
			_stitcher.Render( texture, x * 512, y * 512, 512, 512 );
		} else {
			_ctx.drawImage( texture, x * 512, y * 512 );
		}
		_count++;
		
		var p = Math.round( _count * 100 / _total );
		this.setProgress( p );
		
		if( _count == _total ) {
			this.stitcher = _stitcher;
			this.canvas = _canvas;
			if( this.onPanoramaLoad ) this.onPanoramaLoad();
		}
		
	};

	this.composePanorama = function() {
	
		this.setProgress( 0 );
		console.log( 'Loading panorama for zoom ' + _zoom + '...' );
		
		var w = Math.pow( 2, _zoom );
		var h = Math.pow( 2, _zoom - 1 );
		_count = 0;
		_total = w * h;
		
		var self = this;
		for( var y = 0; y < h; y++ ) {
			for( var x = 0; x < w; x++ ) {
				var url = 'http://maps.google.com/cbk?output=tile&panoid=' + _panoId + '&zoom=' + _zoom + '&x=' + x + '&y=' + y + '&' + Date.now();
				( function( x, y ) { 
					if( _parameters.useWebGL ) {
						var texture = THREE.ImageUtils.loadTexture( url, null, function() {
							console.log( 'loaded ' + url );
							self.composeFromTile( x, y, texture );
						} );
					} else {
						var img = new Image();
						img.addEventListener( 'load', function() {
							self.composeFromTile( x, y, this );			
						} );
						img.crossOrigin = '';
						img.src = url;
					}
				} )( x, y );
			}
		}
		
	};
	
	this.load = function( location ) {
	
		console.log( 'Load for', location );
		this.location = location;
		var self = this;
		_panoClient.getPanoramaByLocation( location, 50, function( result, status ) {
			if( status == google.maps.StreetViewStatus.OK ) {
				var h = google.maps.geometry.spherical.computeHeading( location, result.location.latLng );
				rotation = ( result.tiles.centerHeading - h ) * Math.PI / 180.0;
				copyright = result.copyright;
				self.copyright = result.copyright;
				_panoId = result.location.pano;
				self.composePanorama();
			} else {
				self.throwError( 'Could not retrieve panorama for the following reason: ' + status );
			}
		} );
		
	};
	
	this.adaptTextureToZoom();
	
};