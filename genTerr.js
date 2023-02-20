/*
 * terrain generator CraftScript for WorldEdit
 * Copyright (C) 2023 Twinkling <https://github.com/Twinkling-G>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

/*
author:Twinkling
version:0.1.2
*/


importPackage(Packages.java.io);

importPackage(Packages.javax.imageio);

importPackage(Packages.com.sk89q.worldedit);
importPackage(Packages.com.sk89q.worldedit.regions);
importPackage(Packages.com.sk89q.worldedit.blocks);
importPackage(Packages.com.sk89q.worldedit.function.pattern);
importPackage(Packages.com.sk89q.worldedit.extension.factory);
importPackage(Packages.com.sk89q.worldedit.extension.input);

var usage = "genTerr [\"image_path\"] [--flags] <to_pattern> [<x_offset> <z_offset>] <node_type([node_argv])>*\n";
usage += "flags :\n";
usage += "    k : just check terrain height range.\n";
usage += "nodes:\n";
usage += "    rise(offset) or r(offset) :\n";
usage += "    scaleY(scale) or s(scale) :\n";
usage += "    scalePY(scale) or sp(scale) :\n";
usage += "    scaleNY(scale) or sn(scale) :\n";
usage += "    overlay(flags) or o(flags) :\n";
usage += "        flags :\n";
usage += "            n : only natural block is considered as top block.\n";
usage += "    min(flags) :\n";
usage += "        flags :\n";
usage += "            n : only natural block is considered as top block.\n";
usage += "    max(flags) :\n";
usage += "        flags :\n";
usage += "            n : only natural block is considered as top block.\n";
usage += "    noise(min, max) :\n";
usage += "    useConstPatternDepth(depth) or cpd(depth) :\n";
usage += "    addPatternDepth(offset) or apd(offset) :\n";
usage += "    overlayPatternDepth(flags) or opd(flags) :\n";
usage += "        flags :\n";
usage += "            n : only natural block is considered as top block.\n";
usage += "    fill(flags) or f(flags) :\n";
usage += "        flags :\n";
usage += "            a : remove air\n";
usage += "            g : disenable gradual mask\n";
usage += "            n : only natural block is considered as top block.\n";
usage += "    move(flags) or m(flags) :\n";
usage += "        flags :\n";
usage += "            a : remove air\n";
usage += "            g : disenable gradual mask\n";
usage += "            n : only natural block is considered as top block.\n";
usage += "    compensate(flags) or c(flags) :\n";
usage += "        flags :\n";
usage += "            a : remove air\n";
usage += "            g : disenable gradual mask\n";
usage += "            n : only natural block is considered as top block.\n";
// var log = new BufferedWriter(new FileWriter("genTerrLog.txt"));
context.checkArgs(1, -1, usage);
var defaultImagePath = "terrain_input.png";

var localSession = context.getSession();
var world = player.getWorld();
var region = localSession.getRegionSelector(world).getRegion();
if(!(region instanceof CuboidRegion)){
	throw "genTerr works with cuboid region.\n";
}
var editSession = context.remember();
var mask = localSession.getMask();
if(mask != null){
	editSession.setMask(mask);
}

var terrain = {
	_xOffset : 0, 
	_zOffset : 0, 
	_xSize : 0,
	_zSize : 0,
	_bufferedImg : null,
	_yOffset : 0,

	init : function(path){
		this._bufferedImg = ImageIO.read(new File(path));
		this._xSize = this._bufferedImg.getWidth() - this._xOffset;
		this._zSize = this._bufferedImg.getHeight() - this._zOffset;
	},

	getAlpha : function(x, z){
		var argb = this._bufferedImg.getRGB(this._xOffset + x, this._zOffset + z);
		return (argb & 0xFF000000) >>> 24;
	},

	getY : function(x, z){
		var argb = this._bufferedImg.getRGB(this._xOffset + x, this._zOffset + z);
		var r = (argb & 0x00FF0000) >>> 16;
		return r + this._yOffset - 1;
	},

	getPatternDepth : function(x ,z){
		var argb = this._bufferedImg.getRGB(this._xOffset + x, this._zOffset + z);
		return (argb & 0x0000FF00) >>> 8;
	},

	getYOffset : function() {
		return this._yOffset;
	},

	getYRange : function(){
		var xLimit = this._xOffset + this._xSize;
		var zLimit = this._zOffset + this._zSize;
		var minY = -1;
		var maxY = -1;
		var foundPixel = false;

		for(var x = this._xOffset ; x < xLimit ; x ++){
			for(var z = this._zOffset ; z < zLimit ; z ++){
				var argb = this._bufferedImg.getRGB(x,z);
				if((argb & 0xFF000000) >>> 24 == 0) continue; //using A access;
				var y = ((argb & 0x00FF0000) >>> 16) - 1;//using R access;
				minY = y;
				maxY = y;
				foundPixel = true;
				break;
			}	
			if(foundPixel){
				break;
			}
		}
		for(; x < xLimit ; x ++){
			for(; z < zLimit ; z ++){
				var argb = this._bufferedImg.getRGB(x,z);
				if((argb & 0xFF000000) >>> 24 == 0) continue; //using A access;
				y = ((argb & 0x00FF0000) >>> 16) - 1;//using R access;
				if(y < minY){
					minY = y;
				}else if(y > maxY){
					maxY = y;
				}
			}
			z = 0;
		}

		minY += this._yOffset;
		maxY += this._yOffset;
		return [minY,maxY];
	},

	//offset must be positive or zero.
	setXOffset : function(offset){
		this._xOffset = offset;
		this._xSize = this._bufferedImg.getWidth() - offset;
		if(this._xSize < 0) this._xSize = 0;
	},

	//offset must be positive or zero.
	setZOffset : function(offset){
		this._zOffset = offset;
		this._zSize = this._bufferedImg.getHeight() - offset;
		if(this._zSize < 0) this._zSize = 0;
	},

	//size must be positive or zero.
	setXSize : function(size){
		var maxSize = this._bufferedImg.getWidth() - this._xOffset;
		maxSize = maxSize < 0 ? 0 : maxSize;
		this._xSize = size > maxSize ? maxSize : size;
	},

	//size must be positive or zero.
	setZSize : function(size){
		var maxSize = this._bufferedImg.getHeight() - this._zOffset;
		maxSize = maxSize < 0 ? 0 : maxSize;
		this._zSize = size > maxSize ? maxSize : size;
	},

	setY : function(x, z, y){
		var argb = this._bufferedImg.getRGB(x,z);
		y = y + 1 - this._yOffset;
		if(y < 0) y = 0;
		else if(y > 255) y = 255;


		argb = argb & 0xFF00FFFF | y << 16;
		this._bufferedImg.setRGB(x, z, argb);
	},

	setPatternDepth : function(x ,z ,patternDepth){
		var argb = this._bufferedImg.getRGB(this._xOffset + x, this._zOffset + z);
		argb = argb & 0xFFFF00FF | patternDepth << 8;
		this._bufferedImg.setRGB(x, z, argb);
	},

	rise : function(offset){
		this._yOffset += offset;
	},

	getXOffset : function(){
		return this._xOffset;		
	},

	getZOffset : function(){
		return this._zOffset;
	},

	getXSize : function(){
		return this._xSize;		
	},

	getZSize : function(){
		return this._zSize;
	}
};


var regionHelper = {
	_region : null,
	_ySize : 0,
	_ox : 0,
	_oy : 0,
	_oz : 0,

	init : function(region){
		this._region = region;
		var origin = region.getMinimumPoint();
		this._ySize = region.getHeight();
		this._ox = origin.getX();
		this._oy = origin.getY();
		this._oz = origin.getZ();
	},

	getXSize : function(){
		return this._region.getWidth();
	},

	getYSize : function(){
		return this._ySize;
	},

	getZSize : function(){
		return this._region.getLength();
	},

	getHighestTerrainBlock : function(x, z, naturalOnly){
		var minY = this._oy - 1;
		var maxY = this._oy + this._ySize - 1;
		var y = editSession.getHighestTerrainBlock(this._ox + x, this._oz + z, minY, maxY, naturalOnly);
		return y - this._oy;
	},

	getBlock : function(x, y, z){
		return worldBlock = editSession.getLazyBlock(
			new Vector(this._ox + x, this._oy + y, this._oz + z));
	},

	setBlock : function(x, y, z, patternOrBlock){
		return editSession.setBlock(this._ox + x, this._oy + y, this._oz + z, patternOrBlock);
	},

	setBlocks : function(minX, maxX, minY, maxY, minZ, maxZ, patternOrBlock){
		var pos1 = new Vector(this._ox + minX, this._oy + minY, this._oz + minZ);
		var pos2 = new Vector(this._ox + maxX, this._oy + maxY, this._oz + maxZ);
		var region = new CuboidRegion(world, pos1, pos2);
		var affected = 0;
		region.forEach(function(point){
			affected += editSession.setBlock(point, patternOrBlock) ? 1 : 0;
		});
		return affected;
	},


	moveBlocksInY : function(minX, maxX, minY, maxY, minZ, maxZ, offset){
		var ySize = maxY - minY + 1;
		var air = new BaseBlock(BlockID.AIR);
		var affected = 0;
		if(offset > 0){
			var pos1 = new Vector(this._ox + minX, this._oy + maxY, this._oz + minZ);
			var pos2 = new Vector(this._ox + maxX, this._oy + maxY, this._oz + maxZ);
			var region = new CuboidRegion(world, pos1, pos2);
			region.forEach(function(startPoint){
				for(var y = 0 ; y < ySize ; y ++){
					var point = startPoint.add(0,-y,0);
					var block = editSession.getBlock(point);
					affected += editSession.setBlock(point.add(0, offset, 0), block) ? 1 : 0;
					editSession.setBlock(point,air);
				}
			});
		}else if(offset < 0){
			var pos1 = new Vector(this._ox + minX, this._oy + minY, this._oz + minZ);
			var pos2 = new Vector(this._ox + maxX, this._oy + minY, this._oz + maxZ);
			var region = new CuboidRegion(world, pos1, pos2);
			region.forEach(function(startPoint){
				for(var y = 0 ; y < ySize ; y ++){
					var point = startPoint.add(0,y,0);
					var block = editSession.getBlock(point);
					affected += editSession.setBlock(point.add(0, offset, 0), block) ? 1 : 0;
					editSession.setBlock(point,air);
				}
			});
		}
		return affected; 
	}
};

var justCheckTerrainRange = false;

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
		terrain.init(path);
		argvOffset ++;
		otherArgvsLen --;
	}else{
		terrain.init(defaultImagePath);
	}
}

if(otherArgvsLen > 0){
	var flags = String(argv[argvOffset]);
	if(flags.substring(0,2).equals("--")){
		if(flags.indexOf("k") != -1){
			justCheckTerrainRange = true;
		}
		argvOffset ++;
		otherArgvsLen --;
	}
}

if(justCheckTerrainRange){
	player.print("range = "+terrain.getYRange()+"\n");
}else{

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

	if(otherArgvsLen > 0){
		var pattern = patternFactory.parseFromInput(String(argv[argvOffset]),parserContext);
		argvOffset ++;
		otherArgvsLen --;
	}else{
		throw "pattern is invaild.\n";
	}

	if(otherArgvsLen >= 2){
		var result0 = parseInt(String(argv[argvOffset + 0]));
		var result1 = parseInt(String(argv[argvOffset + 1]));
		if(!isNaN(result0) && !isNaN(result1)){
			if( result0 < 0 || result1 < 0){
				throw "x and z must be zero or positive.\n";
			}
			terrain.setXOffset(result0);
			terrain.setZOffset(result1);
			argvOffset += 2;
			otherArgvsLen -= 2;
		}
	}

	regionHelper.init(region);
	var writeNodeWrapper = fillNodeWrapper;
	var writeNodeArgv = [false,true,false];
	var message = "generating with fill mode...\n";
	while(otherArgvsLen > 0){
		var parserBuf = String(argv[argvOffset]).split("(",2);
		var nodeType = parserBuf[0];
		parserBuf = parserBuf[1].split(")",2);
		var nodeArgv = parserBuf[0];

		if(nodeType.equals("rise") || nodeType.equals("r")){
			nodeArgv = parseInt(nodeArgv, 10);
			if(isNaN(nodeArgv)){
				throw "offset is invaild.\n";
			}
			player.print("rising...\n");
			riseNode(nodeArgv); 
		}else if(nodeType.equals("scaleY") || nodeType.equals("s")){
			nodeArgv = parseInt(nodeArgv, 10);
			if(isNaN(nodeArgv) || nodeArgv < 0){
				throw "scale is invaild.\n";
			}
			player.print("scaling...\n");
			scaleYNode(nodeArgv);
		}else if(nodeType.equals("scalePY") || nodeType.equals("sp")){
			nodeArgv = parseInt(nodeArgv, 10);
			if(isNaN(nodeArgv) || nodeArgv < 0){
				throw "scale is invaild.\n";
			}
			player.print("scaling positive part...\n");
			scalePYNode(nodeArgv);
		}else if(nodeType.equals("scaleNY") || nodeType.equals("sn")){
			nodeArgv = parseInt(nodeArgv, 10);
			if(isNaN(nodeArgv) || nodeArgv < 0){
				throw "scale is invaild.\n";
			}
			player.print("scaling negative part...\n");
			scaleNYNode(nodeArgv);
		}else if(nodeType.equals("overlay") || nodeType.equals("o")){
			player.print("overlaying...\n");
			overlayNode(nodeArgv.indexOf("n") != -1 ? true : false);
		}else if(nodeType.equals("max")){
			player.print("maximize...\n");
			maxNode(nodeArgv.indexOf("n") != -1 ? true : false);
		}else if(nodeType.equals("min")){
			player.print("minimize...\n");
			minNode(nodeArgv.indexOf("n") != -1 ? true : false);
		}else if(nodeType.equals("noise") || nodeType.equals("n")){
			nodeArgv = nodeArgv.split(",",2);
			nodeArgv[0] = parseInt(nodeArgv[0]);
			nodeArgv[1] = parseInt(nodeArgv[1]);
			if(isNaN(nodeArgv[0]) || isNaN(nodeArgv[1])){
				throw "min or max is invaild.\n";
			}
			if(nodeArgv[0] > nodeArgv[1]){
				throw "min should be not greater than max.\n";
			}
			player.print("noising...\n");
			noiseNode(nodeArgv[0], nodeArgv[1]);
		}else if(nodeType.equals("useConstPatternDepth") || nodeType.equals("cpd")){
			var nodeArgv = parseInt(nodeArgv);
			if(isNaN(nodeArgv) || nodeArgv < 0){
				throw "depth is invaild.\n";
			}
			player.print("appling constant pattern depth...\n");
			useConstPatternDepthNode(nodeArgv);
		}else if(nodeType.equals("addPatternDepth") || nodeType.equals("apd")){
			var nodeArgv = parseInt(nodeArgv);
			if(isNaN(nodeArgv)){
				throw "offset is invaild.\n";
			}
			player.print("adding pattern depth...\n");
			addPatternDepthNode(nodeArgv);
		}else if(nodeType.equals("overlayPatternDepthNode") || nodeType.equals("opd")){
			player.print("overlaying pattern depth...\n");
			overlayPatternDepthNode(nodeArgv.indexOf("n") != -1 ? true : false);
		}else if(nodeType.equals("fill") || nodeType.equals("f")){			
			message = "generating with fill mode...\n"
			writeNodeArgv = [
				nodeArgv.indexOf("a") != -1 ? true : false,
				nodeArgv.indexOf("g") != -1 ? false : true,
				nodeArgv.indexOf("n") != -1 ? true : false];
			writeNodeWrapper = fillNodeWrapper;
			break;
		}else if(nodeType.equals("move") || nodeType.equals("m")){
			message = "generating with move mode...\n"
			writeNodeArgv = [
				nodeArgv.indexOf("a") != -1 ? true : false,
				nodeArgv.indexOf("g") != -1 ? false : true,
				nodeArgv.indexOf("n") != -1 ? true : false];
			writeNodeWrapper = moveNodeWrapper;
			break;
		}else if(nodeType.equals("compensate") || nodeType.equals("c")){
			message = "generating with compensate mode...\n"
			writeNodeArgv = [
				nodeArgv.indexOf("a") != -1 ? true : false,
				nodeArgv.indexOf("g") != -1 ? false : true,
				nodeArgv.indexOf("n") != -1 ? true : false];
			writeNodeWrapper = compensateNodeWrapper;
			break;
		}else{
			throw "unknown node : "+ nodeType +".\n";
		}
		argvOffset ++;
		otherArgvsLen --;
	}

	player.print(message);
	var beginTime = new Date().getTime(); 
	var affected = writeNodeWrapper();
	var endTime = new Date().getTime();
	player.print("used "+ (endTime - beginTime) + " ms to generate.\n");
	player.print(affected + " block(s) have been replaced.\n");

}
// log.close();

function fillNodeWrapper(){
	return fillNode(
		writeNodeArgv[0],
		writeNodeArgv[1],
		writeNodeArgv[2]);
}

function moveNodeWrapper(){
	return moveNode(
		writeNodeArgv[0],
		writeNodeArgv[1],
		writeNodeArgv[2]);
}

function compensateNodeWrapper(){
	return compensateNode(
		writeNodeArgv[0],
		writeNodeArgv[1],
		writeNodeArgv[2]);
}

//node implements

function riseNode(offset){
	terrain.rise(offset);
}


function scaleYNode(dstYSpan){
	var range = terrain.getYRange();
	var ySpan = range[1] - range[0];
	if(ySpan == 0) return;
	var terrainXSize = terrain.getXSize();
	var terrainZSize = terrain.getZSize();
	for(var x = 0;x < terrainXSize;x++){
		for(var z = 0;z < terrainZSize;z++){
			var alpha = terrain.getAlpha(x,z);
			if(alpha > 0){
				var y = terrain.getY(x,z);
				y = Math.round(y * dstYSpan / ySpan);
				terrain.setY(x,z,y);
			}
		}
	}
}

function scalePYNode(dstYSpan){
	var range = terrain.getYRange();
	var ySpan = range[1] + 1;
	if(ySpan == 0) return;
	var terrainXSize = terrain.getXSize();
	var terrainZSize = terrain.getZSize();
	for(var x = 0;x < terrainXSize;x++){
		for(var z = 0;z < terrainZSize;z++){
			var alpha = terrain.getAlpha(x,z);
			if(alpha > 0){
				var y = terrain.getY(x,z);
				if(y > 0){
					y = Math.round(y * dstYSpan / ySpan);
					terrain.setY(x,z,y);
				}
			}
		}
	}
}

function scaleNYNode(dstYSpan){
	var range = terrain.getYRange();
	var ySpan = - range[0] - 1;
	if(ySpan == 0) return;
	var terrainXSize = terrain.getXSize();
	var terrainZSize = terrain.getZSize();
	for(var x = 0;x < terrainXSize;x++){
		for(var z = 0;z < terrainZSize;z++){
			var alpha = terrain.getAlpha(x,z);
			if(alpha > 0){
				var y = terrain.getY(x,z);
				if (y < 0) {
					y = Math.round(y * dstYSpan / ySpan);
					terrain.setY(x,z,y);
				}
			}
		}
	}
}

function overlayNode(naturalOnly){
	var terrainXSize = terrain.getXSize();
	var terrainZSize = terrain.getZSize();

	for(var x = 0;x < terrainXSize;x++){
		for(var z = 0;z < terrainZSize;z++){
			var alpha = terrain.getAlpha(x, z);
			if(alpha > 0){
				var terrainY = terrain.getY(x, z);
				var worldTop = regionHelper.getHighestTerrainBlock(x, z, naturalOnly);
				terrain.setY(x,z,worldTop + terrainY + 1);
			}
			
		}
	}
}

function maxNode(naturalOnly){
	var terrainXSize = terrain.getXSize();
	var terrainZSize = terrain.getZSize();

	for(var x = 0;x < terrainXSize;x++){
		for(var z = 0;z < terrainZSize;z++){
			var alpha = terrain.getAlpha(x, z);
			if(alpha > 0){
				var terrainY = terrain.getY(x, z);
				var worldTop = regionHelper.getHighestTerrainBlock(x, z, naturalOnly);
				if(worldTop > terrainY){
					terrain.setY(x,z,worldTop);
				}
			}
		}
	}
}

function minNode(naturalOnly){
	var terrainXSize = terrain.getXSize();
	var terrainZSize = terrain.getZSize();

	for(var x = 0;x < terrainXSize;x++){
		for(var z = 0;z < terrainZSize;z++){
			var alpha = terrain.getAlpha(x, z);
			if(alpha > 0){
				var terrainY = terrain.getY(x, z);
				var worldTop = regionHelper.getHighestTerrainBlock(x, z, naturalOnly);
				if(worldTop < terrainY){
					terrain.setY(x,z,worldTop);
				}
			}
		}
	}
}

function noiseNode(min, max){
	var terrainXSize = terrain.getXSize();
	var terrainZSize = terrain.getZSize();

	for(var x = 0;x < terrainXSize;x++){
		for(var z = 0;z < terrainZSize;z++){
			var alpha = terrain.getAlpha(x, z);
			if(alpha > 0){
				var terrainY = terrain.getY(x, z);
				terrainY += Math.floor(Math.random() * (max + 1 - min)) + min;
				terrain.setY(x, z, terrainY);
			}
		}
	}
}

function useConstPatternDepthNode(patternDepth){
	var terrainXSize = terrain.getXSize();
	var terrainZSize = terrain.getZSize();

	if(patternDepth < 0) patternDepth = 0;
	else if(patternDepth > 255) patternDepth = 255;

	for(var x = 0;x < terrainXSize;x++){
		for(var z = 0;z < terrainZSize;z++){
			terrain.setPatternDepth(x, z, patternDepth);
		}
	}
}

function addPatternDepthNode(offset){
	var terrainXSize = terrain.getXSize();
	var terrainZSize = terrain.getZSize();

	for(var x = 0;x < terrainXSize;x++){
		for(var z = 0;z < terrainZSize;z++){
			var alpha = terrain.getAlpha(x, z);
			if(alpha > 0){
				var d = terrain.getPatternDepth(x, z);
				d += offset;
				if(d < 0) d = 0;
				else if(d > 255) d = 255;
				terrain.setPatternDepth(x,z,d);
			}
		}
	}
}


function overlayPatternDepthNode(naturalOnly){
	var terrainXSize = terrain.getXSize();
	var terrainZSize = terrain.getZSize();

	for(var x = 0;x < terrainXSize;x++){
		for(var z = 0;z < terrainZSize;z++){
			var alpha = terrain.getAlpha(x, z);
			if(alpha > 0){
				var d = terrain.getPatternDepth(x, z);
				var worldTop = regionHelper.getHighestTerrainBlock(x, z, naturalOnly);
				d += worldTop + 1;
				if(d > 255) d = 255;
				terrain.setPatternDepth(x,z,d);
			}
		}
	}
}

function fillNode(removeAir, gradMaskEnable, naturalOnly){
	var regionXSize = regionHelper.getXSize();
	var regionZSize = regionHelper.getZSize();
	var regionYSize = regionHelper.getYSize();

	var terrainXSize = terrain.getXSize();
	var terrainZSize = terrain.getZSize();

	var xLimit = terrainXSize < regionXSize ? terrainXSize : regionXSize;
	var zLimit = terrainZSize < regionZSize ? terrainZSize : regionZSize; 

	var air = new BaseBlock(BlockID.AIR);
	var affected = 0;
	for(var x = 0;x < xLimit;x++){
		for(var z = 0;z < zLimit;z++){
			var alpha = terrain.getAlpha(x, z);

			if(!gradMaskEnable){
				alpha = alpha >= 128 ? 255 : 0;
			}

			if(alpha > 0){
				var terrainY = terrain.getY(x, z);
				var worldTop = regionHelper.getHighestTerrainBlock(x, z, naturalOnly); 
				
				var worldBlock = regionHelper.getBlock(x, worldTop, z);
				var worldBlockPattern = new BlockPattern(worldBlock);

				var toPattern = new RandomPattern();
				toPattern.add(pattern, alpha);
				toPattern.add(worldBlockPattern, 255 - alpha);
				terrainY = Math.round(worldTop + (terrainY - worldTop) * alpha / 255); 
				

				var minY = 0;
				var maxY = terrainY > regionYSize - 1 ? regionYSize - 1 : terrainY;
				if(maxY >= minY){
					affected += regionHelper.setBlocks(x, x, minY, maxY, z, z, toPattern);
				}

				if(!removeAir){
					minY = maxY >= minY ? maxY + 1 : minY;
					maxY = regionYSize - 1;
					if(maxY >= minY){
						affected += regionHelper.setBlocks(x, x, minY, maxY, z, z, air);
					}
				}
			}
		}
	}
	return affected;
}

function moveNode(removeAir, gradMaskEnable, naturalOnly){
	var regionXSize = regionHelper.getXSize();
	var regionZSize = regionHelper.getZSize();
	var regionYSize = regionHelper.getYSize();

	var terrainXSize = terrain.getXSize();
	var terrainZSize = terrain.getZSize();

	var xLimit = terrainXSize < regionXSize ? terrainXSize : regionXSize;
	var zLimit = terrainZSize < regionZSize ? terrainZSize : regionZSize; 

	var air = new BaseBlock(BlockID.AIR);
	var affected = 0;
	for(var x = 0;x < xLimit;x++){
		for(var z = 0;z < zLimit;z++){
			var alpha = terrain.getAlpha(x, z);

			if(!gradMaskEnable){
				alpha = alpha >= 128 ? 255 : 0;
			}
			if(alpha > 0){
				var terrainY = terrain.getY(x, z);
				var worldTop = regionHelper.getHighestTerrainBlock(x, z, naturalOnly); 
				
				var patternDepth = terrain.getPatternDepth(x, z);
				var worldBlock = regionHelper.getBlock(x, worldTop, z);
				var worldBlockPattern = new BlockPattern(worldBlock);

				var toPattern = new RandomPattern();
				toPattern.add(pattern, alpha);
				toPattern.add(worldBlockPattern, 255 - alpha);
				terrainY = Math.round(worldTop + (terrainY - worldTop) * alpha / 255); 
				
				var offset = terrainY - worldTop;

				var fromMinY = worldTop - patternDepth + 1;
				fromMinY = fromMinY < 0 ? 0 : fromMinY;
				var fromMaxY = worldTop;

				var toMinY = fromMinY + offset;
				var toMaxY = fromMaxY + offset;


				if(offset < 0 && toMinY < 0){
					fromMinY -= toMinY;
					toMinY = 0;
				}


				if(offset > 0 && toMaxY > regionYSize - 1){
					fromMaxY -= (toMaxY - (regionYSize - 1));
					toMaxY = regionYSize - 1;
				}

				if(fromMaxY >= fromMinY){
					affected += regionHelper.moveBlocksInY(x, x, fromMinY, fromMaxY, z, z, offset);
				}
					
				var minY = fromMinY;
				var maxY = terrainY - patternDepth;
				maxY = maxY > regionYSize - 1 ? regionYSize - 1 : maxY;
				if(maxY >= minY){
					affected += regionHelper.setBlocks(x, x, minY, maxY, z, z, toPattern);
				}

				if(!removeAir){
					minY = toMaxY + 1;
					maxY = regionYSize - 1;
					if(maxY >= minY){
						affected += regionHelper.setBlocks(x, x, minY, maxY, z, z, air);
					}
				}
				
			}
		}
	}
	return affected;
}

function compensateNode(removeAir, gradMaskEnable, naturalOnly){
	var regionXSize = regionHelper.getXSize();
	var regionZSize = regionHelper.getZSize();
	var regionYSize = regionHelper.getYSize();

	var terrainXSize = terrain.getXSize();
	var terrainZSize = terrain.getZSize();

	var xLimit = terrainXSize < regionXSize ? terrainXSize : regionXSize;
	var zLimit = terrainZSize < regionZSize ? terrainZSize : regionZSize; 

	var air = new BaseBlock(BlockID.AIR);
	var affected = 0;
	for(var x = 0;x < xLimit;x++){
		for(var z = 0;z < zLimit;z++){
			var alpha = terrain.getAlpha(x, z);
			if(!gradMaskEnable){
				alpha = alpha >= 128 ? 255 : 0;
			}

			if(alpha > 0){
				var terrainY = terrain.getY(x, z);
				var worldTop = regionHelper.getHighestTerrainBlock(x, z, naturalOnly); 
				
				var patternDepth = terrain.getPatternDepth(x, z);
				var worldBlock = regionHelper.getBlock(x, worldTop, z);
				var worldBlockPattern = new BlockPattern(worldBlock);

				var toPattern = new RandomPattern();
				toPattern.add(pattern, alpha);
				toPattern.add(worldBlockPattern, 255 - alpha);
				terrainY = Math.round(worldTop + (terrainY - worldTop) * alpha / 255); 

				var minY = worldTop + 1;
				var maxY = terrainY - patternDepth > regionYSize - 1  ? regionYSize - 1 : terrainY - patternDepth;
				if(maxY >= minY){
					affected += regionHelper.setBlocks(x, x, minY, maxY, z, z, worldBlock);
				}
					
				minY = terrainY - patternDepth + 1 < 0 ? 0 : terrainY - patternDepth + 1;
				maxY = terrainY > regionYSize - 1 ? regionYSize - 1 : terrainY;
				if(maxY >= minY){
					affected += regionHelper.setBlocks(x, x, minY, maxY, z, z, toPattern);
				}

				if(!removeAir){
					minY = maxY >= minY ? maxY + 1 : minY;
					maxY = regionYSize - 1;
					if(maxY >= minY){
						affected += regionHelper.setBlocks(x, x, minY, maxY, z, z, air);
					}
				}
			}
		}
	}
	return affected;
}
