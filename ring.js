/*
author:Twinkling
version:0.1.0
*/
importPackage(Packages.java.io);
importPackage(Packages.com.sk89q.worldedit);
importPackage(Packages.com.sk89q.worldedit.regions);
importPackage(Packages.com.sk89q.worldedit.blocks);
importPackage(Packages.com.sk89q.worldedit.function.pattern);
importPackage(Packages.com.sk89q.worldedit.extension.factory);
importPackage(Packages.com.sk89q.worldedit.extension.input);
// var log = new BufferedWriter(new FileWriter("jsDebug.txt"));
var usage = "ring <pattern> <outer_x_radius> <out_z_radius> [ring_width] [<pos_x_offset> <pos_z_offset>] [--flags] [patch_pattern]\n";
usage += "flags :\n";
usage += "    l : use line mode.\n";
usage += "    o : mark the center.\n";
usage += "    a : don't align template center with the x-z grid.\n";
context.checkArgs(3, 8, usage);

var localSession = context.getSession();
var world = player.getWorld();
var editSession = context.remember();
var mask = localSession.getMask();
if(mask != null){
	editSession.setMask(mask);
}

var patternFactory = WorldEdit.getInstance().getPatternFactory();
var parserContext = new ParserContext();
parserContext.setActor(player);
try{
	parserContext.setExtent(localSession.getClipboard().getClipboard());
}catch(e){

}
// parserContext.setPreferringWildcard(true);
// parserContext.setRestricted(true);
parserContext.setSession(localSession);
parserContext.setWorld(world);

var lineMode = false;
var markCenter = false;
var alignGrid = true;
var specifiedPosOffset = false;
var markThePatchPoints = false;
var width = 1;

var argvOffset = 1;
var otherArgvsLen = argv.length - 1;
if(otherArgvsLen > 0){
	if(String(argv[argvOffset]).equals("?")){
		player.print("usage : " + usage);
		throw "This is a help.\n";
	}
}


if(otherArgvsLen > 0){
	var pattern = patternFactory.parseFromInput(String(argv[argvOffset]),parserContext);
	argvOffset ++;
	otherArgvsLen --;
}else{
	throw "pattern is invaild.\n";
}

if(otherArgvsLen > 0){
	var outerXRadius = parseFloat(String(argv[argvOffset]));
	if(!isNaN(outerXRadius)){
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
	if(!isNaN(outerZRadius)){
		argvOffset ++;
		otherArgvsLen --;
	}else{
		throw "out_z_radius is invaild.\n";
	}
}else{
	throw "out_z_radius must be specified.\n";
}

if(otherArgvsLen > 0){
	var result = parseInt(String(argv[argvOffset]));
	if(!isNaN(result)){
		if(result <= 0){
			throw "ring_width must be positive.\n"
		}
		width = result;
		argvOffset ++;
		otherArgvsLen --;
	} 
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
	var flags = String(argv[argvOffset]);
	if(flags.substring(0,2).equals("--")){
		if(flags.indexOf("l") != -1){
			lineMode = true;
		}
		if(flags.indexOf("o") != -1){
			markCenter = true;
		}
		if(flags.indexOf("a") != -1){
			alignGrid = false;
		}
		if(flags.indexOf("p") != -1){
			markThePatchPoints = true;
		}
		argvOffset ++;
		otherArgvsLen --;
	}	
}

if(markThePatchPoints){
	if(otherArgvsLen > 0){
		var patchPattern = patternFactory.parseFromInput(String(argv[argvOffset]),parserContext);
		argvOffset ++;
		otherArgvsLen --;
	}else{
		throw "patch pattern is invaild.\n";
	}
}

if(alignGrid){
	var pos = localSession.getPlacementPosition(player);
}else{
	var location = player.getLocation();
	var pos = new Vector(location.getX(),location.getY(),location.getZ());
}
if(specifiedPosOffset){
	pos = pos.add(posXOffset, 0, posZOffset);
}
var centerBlock = new BaseBlock(BlockID.GOLD_BLOCK);
var patchPattern = markThePatchPoints ? patchPattern : pattern;
while(width > 0 && outerXRadius > 0 && outerZRadius > 0){
	makeRing(editSession, pos, outerXRadius, outerZRadius, pattern, patchPattern, lineMode, markCenter, centerBlock);
	width--;
	outerXRadius --;
	outerZRadius --;
}
player.print("generated a ring\n");
// log.close();


function makeRing(extent, pos, xRadius, zRadius, pattern, patchPattern, lineMode, markCenter, centerBlock){
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
		var blockPoint = pos.add(point);
		extent.setBlock(blockPoint, pattern.apply(blockPoint));
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
					blockPoint = pos.add(patchPoint);
					extent.setBlock(blockPoint, patchPattern.apply(blockPoint));
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
