/*
author:Twinkling
version:0.1.0
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

var usage = "ringTemp <outer_x_diameter> <outer_z_diameter> [--flags] [schematic_path]\n";
usage += "flags :\n";
usage += "    o : mark the center.\n";
usage += "    b : use bigEndian order.\n";
usage += "    s : save as schematic.\n";
usage += "    g : do not generate in the world.\n";
context.checkArgs(2, 4, usage);

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
var markTheCenter = false;

var argvOffset = 1;
var otherArgvsLen = argv.length - 1;
if(otherArgvsLen > 0){
	if(argv[argvOffset].equals("?")){
		player.print("usage : " + usage);
		throw "This is a help.\n";
	}
}

if(otherArgvsLen > 0){
	var outerXDiameter = parseInt(argv[argvOffset]);
	if(!isNaN(outerXDiameter) && outerXDiameter >= 0){
		argvOffset ++;
		otherArgvsLen --;
	}else{
		throw "outer_x_radius is invaild.\n";
	}
}else{
	throw "outer_x_radius must be specified.\n";
}

if(otherArgvsLen > 0){
	var outerZDiameter = parseInt(argv[argvOffset]);
	if(!isNaN(outerZDiameter) && outerZDiameter >= 0){
		argvOffset ++;
		otherArgvsLen --;
	}else{
		throw "outer_z_radius is invaild.\n";
	}
}else{
	throw "outer_z_radius must be specified.\n";
}

if(otherArgvsLen > 0){
	var flags = String(argv[argvOffset]);
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
			markTheCenter = true;
		}
		argvOffset ++;
		otherArgvsLen --;
	}	
}


sliceHelper.init(region, bigEndian);

var air = new BaseBlock(BlockID.AIR)
var centerBlock = new BaseBlock(BlockID.GOLD_BLOCK);
var ySize = sliceHelper.getYSize();
var xSize = sliceHelper.getXSize();
var pos = localSession.getPlacementPosition(player).floor();

var outerXRadius = outerXDiameter / 2;
var outerZRadius = outerZDiameter / 2;
var pos1 = pos.add(
	outerXDiameter & 0x1 ? -Math.floor(outerXRadius) : -outerXRadius,
	0, 
	outerZDiameter & 0x1 ? -Math.floor(outerZRadius) : -outerZRadius
);
var pos2 = pos.add(
	outerXDiameter & 0x1 ? Math.floor(outerXRadius) : outerXRadius - 1,
	ySize - 1,
	outerZDiameter & 0x1 ? Math.floor(outerZRadius) : outerZRadius - 1
); 
var tempRegion = new CuboidRegion(pos1,pos2);
var clipboard = new BlockArrayClipboard(tempRegion);

var beginTime;
var endTime;
beginTime = new Date().getTime(); 
for(var y = 0 ; y < ySize ; y++){
	var xDiameter = outerXDiameter
	var zDiameter = outerZDiameter;
	for(var x = 0 ; x < xSize ; x++){
		var block = sliceHelper.getBlock(x, y);
		makeRing(clipboard, pos, xDiameter, zDiameter, block, false, markTheCenter, centerBlock);
		if(generateTemplate){
			makeRing(editSession, pos, xDiameter, zDiameter, block, false, markTheCenter, centerBlock);
		}
		xDiameter -= 2;
		zDiameter -= 2;
		if(xDiameter <= 0 || zDiameter <= 0) break;
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

		argvOffset ++;
		otherArgvsLen --;
	}else{
		throw "usage: " + usage + "\n"
			+ "must specify schematic path.\n";
	}
}


if(saveSchematic){
	var format = ClipboardFormat.findByAlias("schematic");
	var writer = format.getWriter(bos);
	writer.write(clipboard, world.getWorldData());
	writer.close();

	player.print("schematic has stored in \"" + path + "\".\n");
}


function makeRing(extent, pos, xDiameter, zDiameter, block, lineMode, markTheCenter, centerBlock){
	pos = pos.floor();
	var xRadius = xDiameter / 2;
	var zRadius = zDiameter / 2;

	var center = new Vector(0, 0, 0);
	if(xDiameter & 0x1){
		center = center.add(0.5, 0, 0);
	}
	if(zDiameter & 0x1){
		center = center.add(0, 0, 0.5);
	}

	if(xDiameter <= 1){
		var from = (zDiameter & 0x1) ? -Math.floor(zRadius) : -zRadius;
		var to = (zDiameter & 0x1) ? Math.floor(zRadius) : zRadius - 1;
		for(var z = from; z <= to ; z ++){
			extent.setBlock(pos.add(0, 0, z), block);
		}
	}else if(zDiameter <= 1){
		var from = (xDiameter & 0x1) ? -Math.floor(xRadius) : -xRadius;
		var to = (xDiameter & 0x1) ? Math.floor(xRadius) : xRadius - 1;
		for(var x = from; x <= to ; x ++){
			extent.setBlock(pos.add(x, 0, 0), block);
		}
	}else{
		var bias = new Vector((xDiameter & 0x1) ? 0 : 0.5, 0, (zDiameter & 0x1) ? 0 : 0.5);
		var pointPP = center.add(-xRadius, 0, 0      ).floor().add(bias);
		var pointPN = center.add(-xRadius, 0, -0.5   ).floor().add(bias);
		var pointNP = center.add(xRadius - 1, 0, 0   ).floor().add(bias);
		var pointNN = center.add(xRadius - 1, 0, -0.5).floor().add(bias);

		while(0 >= pointPP.getX()){
			extent.setBlock(pos.add(pointPP), block);
			extent.setBlock(pos.add(pointPN), block);
			extent.setBlock(pos.add(pointNP), block);
			extent.setBlock(pos.add(pointNN), block);

			var dirs = [];
			dirs.push(new Vector(0, 0, 1)); 
			dirs.push(new Vector(1, 0, 1));
			dirs.push(new Vector(1, 0, 0));
			dirs.push(new Vector(1, 0, -1));
			dirs.push(new Vector(0, 0, -1));

			while(dirs.length > 0){
				var dir = dirs.shift();
				var point = pointPP.add(dir);

				var fx = point.getX() / xRadius;
				var fz = point.getZ() / zRadius;
				if(fx * fx + fz * fz <= 1){
					var xDir = dir.getX();
					var zDir = dir.getZ();
					var nextPointPP = pointPP.add(xDir, 0, zDir);
					var nextPointPN = pointPN.add(xDir, 0, -zDir);
					var nextPointNP = pointNP.add(-xDir, 0, zDir);
					var nextPointNN = pointNN.add(-xDir, 0, -zDir);
					break;
				}
			}

			if(!lineMode){
				while(dirs.length > 0){
					var dir = dirs.shift();
					var point = pointPP.add(dir);
					var x = point.getX();
					var z = point.getZ();

					var fx = x / xRadius;
					var fz = z / zRadius;
					if(fx * fx + fz * fz <= 1){
						fx = x / (xRadius - 1);
						fz = z / (zRadius - 1);
						if(fx * fx + fz * fz > 1){
							var xDir = dir.getX();
							var zDir = dir.getZ();
							extent.setBlock(pos.add(pointPP.add(xDir, 0, zDir)), block);
							extent.setBlock(pos.add(pointPN.add(xDir, 0, -zDir)), block);
							extent.setBlock(pos.add(pointNP.add(-xDir, 0, zDir)), block);
							extent.setBlock(pos.add(pointNN.add(-xDir, 0, -zDir)), block);
						}
						break;
					}
				}
			}
			pointPP = nextPointPP;
			pointPN = nextPointPN; 
			pointNP = nextPointNP; 
			pointNN = nextPointNN; 
		}
	}

	if(markTheCenter){
		var fromX = Math.ceil(center.getX() - 1);
		var toX = Math.floor(center.getX() + 1);
		var fromZ = Math.ceil(center.getZ() - 1);
		var toZ = Math.floor(center.getZ() + 1);
		for(var x = fromX ; x < toX ; x ++){	
			for(var z = fromZ ; z < toZ ; z ++){
				extent.setBlock(pos.add(x, 0, z) ,centerBlock);
			}	
		}
	}
}

