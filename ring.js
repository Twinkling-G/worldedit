importPackage(Packages.java.io);


importPackage(Packages.com.sk89q.worldedit);
importPackage(Packages.com.sk89q.worldedit.regions);
importPackage(Packages.com.sk89q.worldedit.blocks);
importPackage(Packages.com.sk89q.worldedit.function.pattern);
importPackage(Packages.com.sk89q.worldedit.extension.factory);
importPackage(Packages.com.sk89q.worldedit.extension.input);

var usage = "ring <pattern> <outer_x_diameter> <out_z_diameter> [ring_width] [--flags] \n";
usage += "flags :\n";
usage += "    l : use line mode.\n";
usage += "    o : mark the center.\n";
context.checkArgs(2, 5, usage);


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
var markTheCenter = false;
var width = 1;

var argvOffset = 1;
var otherArgvsLen = argv.length - 1;
if(otherArgvsLen > 0){
	if(argv[argvOffset].equals("?")){
		player.print("usage : " + usage);
		throw "This is a help.\n";
	}
}


if(otherArgvsLen > 0){
	var pattern = patternFactory.parseFromInput(argv[argvOffset],parserContext);
	argvOffset ++;
	otherArgvsLen --;
}else{
	throw "pattern is invaild.\n";
}

if(otherArgvsLen > 0){
	var outerXDiameter = parseInt(argv[argvOffset]);
	if(!isNaN(outerXDiameter)){
		argvOffset ++;
		otherArgvsLen --;
	}else{
		throw "outer_x_diameter is invaild.\n";
	}
}else{
	throw "outer_x_diameter must be specified.\n";
}


if(otherArgvsLen > 0){
	var outerZDiameter = parseInt(argv[argvOffset]);
	if(!isNaN(outerZDiameter)){
		argvOffset ++;
		otherArgvsLen --;
	}else{
		throw "out_z_diameter is invaild.\n";
	}
}else{
	throw "out_z_diameter must be specified.\n";
}

if(otherArgvsLen > 0){
	var result = parseInt(argv[argvOffset]);
	if(!isNaN(result)){
		if(result <= 0){
			throw "ring_width must be positive.\n"
		}
		width = result;
		argvOffset ++;
		otherArgvsLen --;
	} 
}

if(otherArgvsLen > 0){
	var flags = String(argv[argvOffset]);
	if(flags.substring(0,2).equals("--")){
		if(flags.indexOf("l") != -1){
			lineMode = true;
		}
		if(flags.indexOf("o") != -1){
			markTheCenter = true;
		}
		argvOffset ++;
		otherArgvsLen --;
	}	
}


var pos = localSession.getPlacementPosition(player);
var centerBlock = new BaseBlock(BlockID.GOLD_BLOCK);
while(width > 0 && outerXDiameter > 0 && outerZDiameter > 0){
	makeRing(pos, outerXDiameter, outerZDiameter, lineMode, markTheCenter, centerBlock);
	width--;
	outerXDiameter -= 2;
	outerZDiameter -= 2;
}
player.print("generated a ring\n");

function makeRing(pos, xDiameter, zDiameter, lineMode, markTheCenter, centerBlock){
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
		var from = zDiameter & 0x1 ? -Math.floor(zRadius) : -zRadius;
		var to = zDiameter & 0x1 ? Math.floor(zRadius) : zRadius - 1;
		for(var z = from; z <= to ; z ++){
			editSession.setBlock(pos.add(0, 0, z), pattern);
		}
	}else if(zDiameter <= 1){
		var from = xDiameter & 0x1 ? -Math.floor(xRadius) : -xRadius;
		var to = xDiameter & 0x1 ? Math.floor(xRadius) : xRadius - 1;
		for(var x = from; x <= to ; x ++){
			editSession.setBlock(pos.add(x, 0, 0), pattern);
		}
	}else{
		var bias = new Vector(xDiameter & 0x1 ? 0 : 0.5, 0, zDiameter & 0x1 ? 0 : 0.5);
		var pointPP = center.add(-xRadius, 0, 0      ).floor().add(bias);
		var pointPN = center.add(-xRadius, 0, -0.5   ).floor().add(bias);
		var pointNP = center.add(xRadius - 1, 0, 0   ).floor().add(bias);
		var pointNN = center.add(xRadius - 1, 0, -0.5).floor().add(bias);

		while(0 >= pointPP.getX()){
			editSession.setBlock(pos.add(pointPP), pattern);
			editSession.setBlock(pos.add(pointPN), pattern);
			editSession.setBlock(pos.add(pointNP), pattern);
			editSession.setBlock(pos.add(pointNN), pattern);

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
							editSession.setBlock(pos.add(pointPP.add(xDir, 0, zDir)), pattern);
							editSession.setBlock(pos.add(pointPN.add(xDir, 0, -zDir)), pattern);
							editSession.setBlock(pos.add(pointNP.add(-xDir, 0, zDir)), pattern);
							editSession.setBlock(pos.add(pointNN.add(-xDir, 0, -zDir)), pattern);
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
				editSession.setBlock(pos.add(x, 0, z) ,centerBlock);
			}	
		}
	}
}
