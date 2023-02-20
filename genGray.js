
/*
author:Twinkling
version:0.1.0
*/

importPackage(Packages.java.lang);

importPackage(Packages.javax.imageio);

importPackage(Packages.com.sk89q.worldedit);
importPackage(Packages.com.sk89q.worldedit.regions);
importPackage(Packages.com.sk89q.worldedit.blocks);

var usage = "genGray [\"image_path\"] [--flags]\n";
usage += "flags :\n";
usage += "    n : only natural block is considered as top block.\n";
context.checkArgs(0, 2, usage);

var defaultImagePath = "terrain_output.png";

var localSession = context.getSession();
var world = player.getWorld();
var region = localSession.getRegionSelector(world).getRegion();
if(!(region instanceof AbstractRegion)){
	throw "improper region.\n";
}
var editSession = context.remember();
var mask = localSession.getMask();
if(mask != null){
	editSession.setMask(mask);
}

var regionHelper = {
	_regionPoly2D : null,
	_ySize : 0,
	_ox : 0,
	_oy : 0,
	_oz : 0,

	init : function(region){
		this._regionPoly2D = new Polygonal2DRegion();
		this._ySize = region.getHeight();
		var origin = region.getMinimumPoint();
		this._ox = origin.getX();
		this._oy = origin.getY();
		this._oz = origin.getZ();

		var ox = this._ox;
		var oz = this._oz;
		var regionPoly2D = this._regionPoly2D;
		var points = region.polygonize(-1);
		points.forEach(function(point){
			regionPoly2D.addPoint(point.add(-ox,-oz));
		});
	},

	getXSize : function(){
		return this._regionPoly2D.getWidth();
	},

	getYSize : function(){
		return this._ySize;
	},

	getZSize : function(){
		return this._regionPoly2D.getLength();
	}, 

	getHighestTerrainBlock : function(x, z, naturalOnly){
		var minY = this._oy - 1;
		var maxY = this._oy + this._ySize - 1;
		var y = editSession.getHighestTerrainBlock(this._ox + x, this._oz + z, minY, maxY, naturalOnly);
		return y - this._oy;
	},
	
	getPoly2D : function(){
		return this._regionPoly2D;
	}
};

var naturalOnly = false;

var argvOffset = 1;
var otherArgvsLen = argv.length - 1;
if(otherArgvsLen > 0){
	if(String(argv[argvOffset]).equals("?")){
		player.print("usage : " + usage);
		throw "This is a help.\n";
	}
}

if(otherArgvsLen > 0){
	var path = String(argv[argvOffset]);
	if(path.charAt(0).equals("\"")){
		path = path.slice(1,-1);
		var file = new File(path);
		argvOffset ++;
		otherArgvsLen --;
	}else{
		var file = new File(defaultImagePath);
	}
}

if(otherArgvsLen > 0){
	var flags = String(argv[argvOffset]);
	if(flags.substring(0,2).equals("--")){
		if(flags.indexOf("n") != -1){
			naturalOnly = true;
		}
		argvOffset ++;
		otherArgvsLen --;
	}
}


regionHelper.init(region);
var regionXSize = regionHelper.getXSize();
var regionZSize = regionHelper.getZSize();
var bufferedImg = new BufferedImage(regionXSize, regionZSize, BufferedImage.TYPE_INT_ARGB);

for(var x = 0 ; x < regionXSize ; x++){
	for(var z = 0 ; z < regionZSize ; z++){
		bufferedImg.setRGB(x, z, 0x0);
	}	
}

var regionPoly2D = regionHelper.getPoly2D();
regionPoly2D.forEach(function(point){
	var x = point.getX();
	var z = point.getZ();
	var y = regionHelper.getHighestTerrainBlock(x, z, naturalOnly) + 1;
	var argb = 0xFF << 24 | y << 16 | y << 8 | y;
	bufferedImg.setRGB(x, z, argb);
});

ImageIO.write(bufferedImg, "png", file);
player.print("gray has been generated\n");

