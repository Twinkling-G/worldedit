/*
author:Twinkling
version:0.2.0
*/
importPackage(Packages.java.io);

importPackage(Packages.com.sk89q.worldedit);
importPackage(Packages.com.sk89q.worldedit.regions);
importPackage(Packages.com.sk89q.worldedit.blocks);
importPackage(Packages.com.sk89q.worldedit.function.pattern);
importPackage(Packages.com.sk89q.worldedit.extent.clipboard);
importPackage(Packages.com.sk89q.worldedit.extent.clipboard.io);
importPackage(Packages.com.sk89q.worldedit.function.operation);

importPackage(Packages.com.sk89q.jnbt);

var usage = "ringTemp <outer_x_radius> <outer_z_radius> [<pos_x_offset> <pos_z_offset>] [--flags] [schematic_path]\n";
usage += "flags :\n";
usage += "    o : mark the center.\n";
usage += "    b : use bigEndian order.\n";
usage += "    s : save as schematic.\n";
usage += "    g : do not generate in the world.\n";
usage += "    a : don't align template center with the x-z grid.\n";
context.checkArgs(2, 6, usage);

var localSession = context.getSession();
var world = player.getWorld();
var region = localSession.getRegionSelector(world).getRegion();
if(!(region instanceof CuboidRegion)){
	throw "ringTemp works with cuboid region.\n";
}
var editSession = context.remember();
var mask = localSession.getMask();
if(mask != null){
	editSession.setMask(mask);
}

var sliceHelper = {
	_clipboard : null,
	_origin : null,
	_bigEndian : false,
	_ySize : 0,
	_anixSize : 0,
	_xAnix : false,

	init : function(region, bigEndian){
		this._clipboard = BlockArrayClipboard(region);
		var clipboard = this._clipboard;
		region.forEach(function(point){
			var block = editSession.getBlock(point);
			if(block.getId() != BlockID.AIR){
				clipboard.setBlock(point,block);
			}
		});
		this._origin = region.getMinimumPoint();
		this._bigEndian = bigEndian;
		this._ySize = region.getHeight();
		if(region.getWidth() == 1){
			this._xAnix = false;
			this._anixSize = region.getLength();
		}else{
			this._xAnix = true;
			this._anixSize = region.getWidth();
		}
	},

	getBlock : function(x, y){
		x = bigEndian ? this._anixSize - 1 - x : x;
		return this._clipboard.getBlock(
			this._origin.add(
				this._xAnix ? x : 0, 
				y, 
				this._xAnix ? 0 : x
			)
		);
	},

	getYSize : function(){
		return this._ySize;
	},

	getXSize : function(){
		return this._anixSize;
	}
}



var saveSchematic = false;
var generateTemplate = true;
var bigEndian = false;
var markCenter = false;
var alignGrid = true;
var specifiedPosOffset = false;

var argvOffset = 1;
var otherArgvsLen = argv.length - 1;
if(otherArgvsLen > 0){
	if(String(argv[argvOffset]).equals("?")){
		player.print("usage : " + usage);
		throw "This is a help.\n";
	}
}

if(otherArgvsLen > 0){
	var outerXRadius = parseFloat(String(argv[argvOffset]));
	if(!isNaN(outerXRadius) && outerXRadius >= 0){
		argvOffset ++;
		otherArgvsLen --;
	}else{
		throw "outer_x_radius is invaild.\n";
	}
}else{
	throw "outer_x_radius must be specified.\n";
}

if(otherArgvsLen > 0){
	var outerZRadius = parseFloat(String(argv[argvOffset]));
	if(!isNaN(outerZRadius) && outerZRadius >= 0){
		argvOffset ++;
		otherArgvsLen --;
	}else{
		throw "outer_z_radius is invaild.\n";
	}
}else{
	throw "outer_z_radius must be specified.\n";
}

if(otherArgvsLen >= 2){
	var posXOffset = parseFloat(String(argv[argvOffset + 0]));
	var posZOffset = parseFloat(String(argv[argvOffset + 1]));
	if(!isNaN(posXOffset) && !isNaN(posZOffset)){
		specifiedPosOffset = true;
		argvOffset +=2;
		otherArgvsLen -=2;
	}	
}

if(otherArgvsLen > 0){
	var flags = String(String(argv[argvOffset]));
	if(flags.substring(0,2).equals("--")){
		if(flags.indexOf("s") != -1){
			saveSchematic = true;
		}
		if(flags.indexOf("g") != -1){
			generateTemplate = false;
		}
		if(flags.indexOf("b") != -1){
			bigEndian = true;
		}
		if(flags.indexOf("o") != -1){
			markCenter = true;
		}
		if(flags.indexOf("a") != -1){
			alignGrid = false;
		}
		argvOffset ++;
		otherArgvsLen --;
	}	
}


sliceHelper.init(region, bigEndian);

var centerBlock = new BaseBlock(BlockID.GOLD_BLOCK);
var ySize = sliceHelper.getYSize();
var xSize = sliceHelper.getXSize();

if(alignGrid){
	var pos = localSession.getPlacementPosition(player);
}else{
	var location = player.getLocation();
	var pos = new Vector(location.getX(),location.getY(),location.getZ());
}
if(specifiedPosOffset){
	pos = pos.add(posXOffset, 0, posZOffset);
}

if(saveSchematic){
	var tolerance = 0.1;
	var pos1 = pos.add(-outerXRadius, 0, -outerZRadius);
	pos1 = pos1.floor().add(
		pos1.getX() - Math.floor(pos1.getX()) > 0.5 + tolerance ? 1 : 0,
		0,
		pos1.getZ() - Math.floor(pos1.getZ()) > 0.5 + tolerance ? 1 : 0
	);
	var pos2 = pos.add(outerXRadius, ySize - 1, outerZRadius);
	pos2 = pos2.floor().add(
		pos2.getX() - Math.floor(pos2.getX()) <= 0.5 - tolerance ? -1 : 0,
		0,
		pos2.getZ() - Math.floor(pos2.getZ()) <= 0.5 - tolerance ? -1 : 0
	);
	var tempRegion = new CuboidRegion(pos1,pos2);
	var clipboard = new BlockArrayClipboard(tempRegion);
}

var beginTime;
var endTime;
beginTime = new Date().getTime(); 
for(var y = 0 ; y < ySize ; y++){
	var xRadius = outerXRadius
	var zRadius = outerZRadius;
	for(var x = 0 ; x < xSize ; x++){
		var block = sliceHelper.getBlock(x, y);
		if(saveSchematic){
			makeRing(clipboard, pos, xRadius, zRadius, block, false, markCenter, centerBlock);
		}
		if(generateTemplate){
			makeRing(editSession, pos, xRadius, zRadius, block, false, markCenter, centerBlock);
		}
		xRadius --;
		zRadius --;
		if(xRadius <= 0 || zRadius <= 0) break;
	}
	pos = pos.add(0, 1, 0);
}
endTime = new Date().getTime(); 
player.print("used "+ (endTime - beginTime) + " ms to generate.\n");

if(saveSchematic){
	if(otherArgvsLen > 0){	
		var path = String(argv[argvOffset]) + ".schematic";
		var bos = new BufferedOutputStream(
			new FileOutputStream(
				new File(path)
			)
		);

		var format = ClipboardFormat.findByAlias("schematic");
		var writer = format.getWriter(bos);
		writer.write(clipboard, world.getWorldData());
		writer.close();
		player.print("schematic has stored in \"" + path + "\".\n");

		argvOffset ++;
		otherArgvsLen --;
	}else{
		throw "usage: " + usage + "\n"
			+ "must specify schematic path.\n";
	}
}

function makeRing(extent, pos, xRadius, zRadius, block, lineMode, markCenter, centerBlock){
	var point = pos.add(xRadius, 0 , 0);
	point = point.getX() - Math.floor(point.getX()) >= 0.5 ? point.floor() : point.floor().add(-1, 0, 0);
	point = point.subtract(pos);
	point = point.add(0.5, 0, 0.5);

	var pointZ = point.getZ();
	var pointX = point.getX();
	var fx = pointX / xRadius;
	var fz = pointZ / zRadius;
	while(fx * fx + fz * fz > 1){
		if(pointX <= 0) return;
		pointX--;
		fx = pointX / xRadius;
		fz = pointZ / zRadius;
	}
	point = point.setX(pointX);

	do{
		pointZ--;
		fx = pointX / xRadius;
		fz = pointZ / zRadius;
	}while(fx * fx + fz * fz <= 1);
	pointZ++;
	point = point.setZ(pointZ);

	var startPoint = point;		
	var dirs = [];
	var checkedDirs = [];
	dirs.push(new Vector(0, 0, -1));
	dirs.push(new Vector(-1, 0, -1)); 
	dirs.push(new Vector(-1, 0, 0));
	dirs.push(new Vector(-1, 0, 1));
	dirs.push(new Vector(0, 0, 1));
	dirs.push(new Vector(1, 0, 1));
	dirs.push(new Vector(1, 0, 0));
	dirs.push(new Vector(1, 0, -1));

	do{
		extent.setBlock(pos.add(point), block);
		while(dirs.length > 0){
			var nextDir = dirs.shift();
			var nextPoint = point.add(nextDir);

			fx = nextPoint.getX() / xRadius;
			fz = nextPoint.getZ() / zRadius;
			if(fx * fx + fz * fz <= 1){
				break;
			}else{
				checkedDirs.push(nextDir);
			}
		}
		if(dirs.length == 0) break;

		if(!lineMode && checkedDirs.length & 0x1){
			var patchDir = dirs[0];
			var patchPoint = point.add(patchDir);
			var x = patchPoint.getX();
			var z = patchPoint.getZ();

			fx = x / xRadius;
			fz = z / zRadius;
			if(fx * fx + fz * fz <= 1){
				fx = x / (xRadius - 1);
				fz = z / (zRadius - 1);
				if(fx * fx + fz * fz > 1){
					extent.setBlock(pos.add(patchPoint), block);
				}
			}
		}

		dirs.unshift(nextDir);
		if(checkedDirs.length > 0){
			dirs.unshift(checkedDirs.pop());
			if(checkedDirs.length > 0){
				if(checkedDirs.length & 0x1){
					dirs.unshift(checkedDirs.pop());
				}
				while(checkedDirs.length > 0){
					dirs.push(checkedDirs.shift());
				}
			}	
		}
		
		point = nextPoint;
	}while(!point.equals(startPoint));

	if(markCenter){
		var center = pos.subtract(pos.floor()); 
		var fromX = Math.ceil(center.getX() - 1);
		var toX = Math.floor(center.getX() + 1);
		var fromZ = Math.ceil(center.getZ() - 1);
		var toZ = Math.floor(center.getZ() + 1);
		for(var x = fromX ; x < toX ; x ++){	
			for(var z = fromZ ; z < toZ ; z ++){
				extent.setBlock(pos.add(x, 0, z), centerBlock);
			}	
		}
	}
}

