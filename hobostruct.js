
//---------------------------------------------------------------------------
//-------------------Section 1: Defines Buffer Objects-----------------------
//---------------------------------------------------------------------------\
//Objective: Defines buffer objects to contain either Float or Int 32 bit values
//in typed fixed length arrays. These are used as containers for faces and vertices
//for an effciency boost over untyped arrays. The objects keep track of the size  
//(number of 32 bit values stored) which is utilized by later algorithms.
//
//--------------------------------------------------------------------------------
//---- Object   : BufferPrototype
//---- Objective: To catch only one copy of methods shared by buffer objects.
//---- Members:     |->push(32bitValue)
//----              |->pop()
//----              |->clear()
//--------------------------------------------------------------------------------

function BufferPrototype() {
    //push(32bitValue): Appends element on top of array.
    this.push = function(my32bitvalue) {
        this.size++;
        //We allocate more space
        if (this.size > this.maxsize) {
           /*var temp_array = Uint32Array(this.size+this.increment);
           for (var i = 0; i < this.size; i++){
               temp_array[i] = this.array[i];
           }
           this.array=temp_array;
           //Should manually destroy memory here once I figure out how
        }*/
             throw new Error('Buffer size exceeded.');
        }
        else{
            this.array[this.size-1] = my32bitvalue;
        }
    }
    
    //Remove top value from array and return
    this.pop = function() {
        this.size--;
        if (this.size<0){
            this.size=0;
            return null;    //You messed up
        }
        return this.array[this.size];
    }
    
    //Clear/Dump array for future push operations
    this.clear = function() {
        this.size = 0;
    }
};

//--------------------------------------------------------------------------------
//---- Object   : Buffer
//---- Objective: To store typed arrays and keep track of their size (number of filled
//                slots).
//---- Members:     |->push(32bitValue)
//----              |->pop()
//----              |->clear()
//--------------------------------------------------------------------------------
function Buffer(type,size) {
    if (type == 'Uint32'){
        this.array= new Uint32Array(size);
    }
    else if(type == 'Int32'){
        this.array= new Int32Array(size);
    }
    else if (type == 'Float32'){
        this.array= new Float32Array(size);
    }
    else {
        new Error(type.toString() + " type not supported by Buffer")
    }
    this.size = 0;
    this.maxsize = size;
};

//HELLO I AM BUFFER PARENT HERE TO HELP
Buffer.prototype = new BufferPrototype(); //THIS **SHOULD** WORK

//---------------------------------------------------------------------------
//---------------------Section 2: Defines Math Objects-----------------------
//---------------------------------------------------------------------------
//Objective: Provide quick sort implementation for sorting faces within a large continuous Int32Array by each face's closest vertex,
//which are themselves in a large continuous Float32Array
//
var HoboMath = function(){
    //Input -- [a1,a2,a3]<cross>[b1,b2,b3]
    this.cross = function(a,b,arrayptr,arrayind) {
        //arrayind = typeof arrayind == 'undefined' ? 0 : arrayind;
        arrayptr[arrayind]=a[1]*b[2]-a[2]*b[1];
        arrayptr[arrayind+1]=a[2]*b[0]-a[0]*b[2];
        arrayptr[arrayind+2]=a[0]*b[1]-a[1]*b[0];
    }
    
    //Input -- [a1,a2,a3]<dot>[b1,b2,b3]
    this.dot = function(a,b) {
        return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
    }
    
    this.painsort = function(faces, vertices, tempbuffer) {
        //Calculate the max z values for each face before we do quicksort
        for (var i=0; i<faces.size; i+=4) {
            tempbuffer.push(Math.max(vertices.array[faces.array[i]*3+2], vertices.array[faces.array[i+1]*3+2], vertices.array[faces.array[i+2]*3+2]));
       } 
        
        
        //Values for swapping in embedded function
        var swap=0;   //swap for swapping
        var faceswap = new Float32Array(4);   //For swapping faces and color
        
        //Recursive quicksort
        function faces_quicksort(a, faces, left, right){
            //Swap helper function
            this.swap=function(a,faces,i1,i2){
                //not multithread safe
                swap=a[i1];
                a[i1]=a[i2];
                a[i2]=swap;
                
                //swap faces
                faceswap[0]      = faces[i1*4];
                faceswap[1]      = faces[i1*4+1];
                faceswap[2]      = faces[i1*4+2];
                faceswap[3]      = faces[i1*4+3];
                 
                faces[i1*4]       = faces[i2*4];
                faces[i1*4+1]     = faces[i2*4+1];
                faces[i1*4+2]     = faces[i2*4+2];
                faces[i1*4+3]     = faces[i2*4+3];
                 
                faces[i2*4]   = faceswap[0];
                faces[i2*4+1] = faceswap[1];
                faces[i2*4+2] = faceswap[2];
                faces[i2*4+3] = faceswap[3];
            };
            
            //base case: one element to sort
            if (right<=left){
                return 0;   
            }
                
            //decide our pivot is the left most element and find our first
            //swap-pivot
            var i=left+1;
            while(a[left]<a[i] && i<=right){
                i++;
            }
            //We now know that our index is either...
            // -- First place for swapping
            // -- end of array+1
            if ((i-1) == right)
            {
                this.swap(a,faces,left,right);
                return faces_quicksort(a,faces,left,right-1);
            }
            
            var open=i;
            while(i<=right) {
                //If greater than, it's in order
                //Otherwise, if our current element is less than pivot, we swap
                if (a[i]>a[left])
                {
                    this.swap(a,faces,i,open)
                    open++;
                }
                i++;
            }
            
            open--;    //done swapping larger values for lesser values
            
            //Swap pivot, currently still at left, with the greateast index item less than the pivot. (putting it in the ight place) 
            this.swap(a,faces,left,open);
            //END SWAP SECTION -- PRETEND ITS A FUNCTION
            
            faces_quicksort(a,faces,left,open-1);
            faces_quicksort(a,faces,open+1,right);
            return 0;
        };
        faces_quicksort(tempbuffer.array, faces.array, 0, tempbuffer.size-1);
    }
    
};

var HoboMath = new HoboMath();

//---------------------------------------------------------------------------
//---------------------Section 3: Defines mesh Objects-----------------------
//---------------------------------------------------------------------------
//Objective: To define objects to represent an object's mesh. It stores the faces
//and vertecies as well as the maximum vertex's length, which is utilized later
//in the rendering algorithm to avoid transforming mesh's outside the camera's view
//to the camera space.
//
//--------------------------------------------------------------------------------
//---- Object   : MeshPrototype
//---- Objective: To catch only one copy of methods shared by mesh objects.
//---- Members:     |->addVertex(vertex)
//----              |->print()
//--------------------------------------------------------------------------------
function MeshPrototype(){
    this.addVertex = function(vertex) {
        if ((vertex instanceof Array) && (vertex.length == 3)){
            this.vertices.push(vertex[0]);
            this.vertices.push(vertex[1]);
            this.vertices.push(vertex[2]);
            var length = Math.sqrt(vertex[0]*this.vertices.array[0] + this.vertices.array[1]*this.vertices.array[1] + this.vertices.array[2]*this.vertices.array[2]);
            if (this.maxWidth < length){
                this.maxWidth = length;
            }
        }
        else {
            throw new Error("addVertex not passed length 3 array");
        }
    }
    this.addFace = function(face){
        if ((face instanceof Array) && (face.length == 4)){
            this.faces.push(face[0]);
            this.faces.push(face[1]);
            this.faces.push(face[2]);
            this.faces.push(face[3]);
        }
        else {
            throw new Error("addVertex not passed length 3 array");
        }
    }
}

//--------------------------------------------------------------------------------
//---- Prototype: Mash
//---- Object   : Mesh
//---- Objective: To store vertices, faces, and maxwidth for a mesh.
//---- Members:     |->vertices - Vertices that define the mesh
//----              |->faces    - Indices to three vertices and a color
//----              |->maxWidth - Largest distance between center and a vetex
//--------------------------------------------------------------------------------
function Mesh(vertices, faces){
    //Checks format of vertices input and formats Float32Array appropriately.
    if (vertices instanceof Array){
        if (vertices[0] instanceof Array){
            this.vertices = new Buffer('Float32',3*vertices.length);
            for (var i in vertices){
                for (var j in vertices[i]){
                    this.vertices.push(vertices[i][j]);
                }
            }
        }
        else if((typeof vertices[0]) == "number"){
            this.vertices = new Buffer('Float32',vertices.length);
            for (var i in vertices){
                this.vertices.push(vertices[i]);    
            }
        }
        else{
            throw new Error('Vertices argument is a wrongly formatted Array');
        }
    }
    else if (vertices instanceof Float32Array){
        this.vertices = vertices;   //[x,y,z] Must be a 32-bit floating array    
    }
    else {
        throw new Error('Vertices argument should be Array or Float32Array');
    }
    
    //Checks format of faces input and formates Uint32Array appropriately.
    if (faces instanceof Array){
        if (faces[0] instanceof Array){
            this.faces = new Buffer('Uint32',4*faces.length);
            for (var i in faces){
                for (var j in faces[i]){
                    this.faces.push(faces[i][j]);
                }
            }
        }
        else if((typeof faces[0]) == "number"){
            this.faces = new Buffer('Uint32',faces.length);
            for (var i in faces){
                this.vertices.push(faces[i]);    
            }
        }
        else{
            throw new Error('Faces argument is a wrongly formatted Array');
        }
    }
    else if (faces instanceof Uint32Array){
        this.faces = faces;   //[(this.meshList[this.meshInstances[i+6]].vertices[this.meshList[this.meshInstances[i+6]].faces[j+2]]   - this.meshList[this.meshInstances[i+6]].vertices[this.meshList[this.meshInstances[i+6]].faces[j]]), (this.meshList[this.meshInstances[i+6]].vertices[this.meshList[this.meshInstances[i+6]].faces[j+2]+1] - this.meshList[this.meshInstances[i+6]].vertices[this.meshList[this.meshInstances[i+6]].faces[j]+1]), v3, argb color] Must be a 32-bit unsigned integer array    
    }
    else {
        throw new Error('Faces argument should be Array or Uint32Array');
    }
    
    //Assigns proper prototype and calculates maxWidth
    this.prototype = MeshPrototype;
    this.maxWidth = 0;
    for (var i=0; i<this.vertices.size; i+=3) {
        var length = this.vertices.array[i]*this.vertices.array[i] + this.vertices.array[i+1]*this.vertices.array[i+1] + this.vertices.array[i+2]*this.vertices.array[i+2];
        if (this.maxWidth < length){
            this.maxWidth = length;
        }
    }
    this.maxWidth = Math.sqrt(this.maxWidth);
}
Mesh.prototype = new MeshPrototype();

//---------------------------------------------------------------------------
//---------------------Section 4: Defines World Object-----------------------
//---------------------------------------------------------------------------
//Objective: To create a object to represent the model of a world, containing 
//the meshes and instances of them in the world. Also to provide a render function
//which projects mesh instances in view to a camera's space and draws them on a canvas.
//
//Initialize World with a list of meshes and meshIndices that decribe a copy of
//a mesh as well as its position
//--------------------------------------------------------------------------------
//---- Object   : World
//---- Members:     |->this.meshInstances  - Array of instances of meshes in world space. Contains position, direction, and index in this.meshList.
//                  |                        [position 3 slots, direction 3 slots, and index] i.e. [x, y, z, yaw, pitch, roll, meshIndex]     
//----              |->this.meshList     - Array of mesh objects
//----              |->render() - method that transforms world space to camera space, projects, and makes a frame
//--------------------------------------------------------------------------------
function World(meshInstances, meshList){
    this.meshList = meshList;
    if (meshInstances instanceof Object){
        
        if (meshInstances[0] instanceof Array){
            this.meshInstances = new Float32Array(7*meshInstances.length);
            for (var i in meshInstances){
                for (var j in meshInstances[i]){
                    this.meshInstances[i*7 + j] = (meshInstances[i][j]);
                }
            }
        }
        else if((typeof meshInstances[0]) == "number"){
            this.meshInstances = new Float32Array(meshInstances.length);
            for (var i in meshInstances){
                this.meshInstances[i] = (meshInstances[i]);    
            }
        }
        else{
            throw new Error('this.meshInstances argument is a wrongly formatted Array');
        }
    }
    
    else if (meshInstances instanceof Float32Array){
        this.meshInstances = meshInstances;   //[(this.meshList[this.meshInstances[i+6]].vertices[this.meshList[this.meshInstances[i+6]].faces[j+2]]   - this.meshList[this.meshInstances[i+6]].vertices[this.meshList[this.meshInstances[i+6]].faces[j]]), (this.meshList[this.meshInstances[i+6]].vertices[this.meshList[this.meshInstances[i+6]].faces[j+2]+1] - this.meshList[this.meshInstances[i+6]].vertices[this.meshList[this.meshInstances[i+6]].faces[j]+1]), v3, argb color] Must be a 32-bit unsigned integer array    
    }
    else {
        throw new Error('this.meshInstances argument should be Array or Float32Array');
    }
    
    //Arrays where our buffer output goes : We start with a one-to-one mapping between object and buffer
    /*this.renderFaces = [];
    this.renderVertices = [];
    this.renderSortbuddy = [];*/
    //Quickly calculate size for render buffer
    
    //-------------------------Seperate into view object---------------------
    //build meshInstances
    //build meshList
    
    var totalVertices=0;
    var totalFaces=0;
    for (var i=0; i<this.meshInstances.length; i+=7){
        totalVertices+=(this.meshList[this.meshInstances[i+6]].vertices.size);
        totalFaces+=(this.meshList[this.meshInstances[i+6]].faces.size);
        //Push buffer for this object to renderFaces
    }
    var renderVertices = new Buffer('Float32', totalVertices);
    var renderFaces = new Buffer('Uint32', totalFaces);
    /*this.renderFaces.push(new IntBuffer((totalIndices)>>0, totalIndices/2));
    this.renderVertices.push(new FloatBuffer((totalVertices)>>0, totalVertices/2));
    //Divide by four Math.sin(this.meshInstances[i+5])e every face is 4 elements
    this.renderSortbuddy.push(new FloatBuffer(totalIndices/4)>>0, totalIndices/2);*/
    
    
    //Buffers for storing faces and vertices to be drawn
    //Computational vector used every iteration
    //Basically static globals within our render function
    var renderSortbuddy = new Buffer('Float32', Math.ceil(totalFaces/4));
    var cameraPosition = new Float32Array(3);
    var cameraDirection = new Float32Array(3);
    var cameraUp = new Float32Array(3);
    var cameraLeft = new Float32Array(3);
    var rotArray = new Float32Array(3);
    var rotMatrix = new Float32Array(9);
    var faceNormal = new Float32Array(3);
    
    //----------------------------------------------------------------------------
    //---- render
    //---- Puts everything together to render a scene
    this.render = function(cameraPositionArg, cameraDirectionArg, cameraUpArg, width, height, context){
        //Clear Buffers
        renderVertices.clear();
        renderFaces.clear();
        renderSortbuddy.clear();
        //Assign given inputs to faster typed arrays
        for (var i = 0;i<3;i++){
            cameraPosition[i] = cameraPositionArg[i]; 
            cameraDirection[i] = cameraDirectionArg[i];
            cameraUp[i] = cameraUpArg[i];
        }
        
        
        for (var i=0;i<this.meshInstances.length;i+=7){
            //Calculate rotation Matrix for rotating mesh vertices by the yaw, pitch and roll stored in the mesh instances
            /*if (!(this.meshInstances[i+3] == this.meshInstances[i+4] == this.meshInstances[i+5] == 0)){*/
                rotMatrix[0] = Math.cos(this.meshInstances[i+3])*Math.cos(this.meshInstances[i+4]);
                rotMatrix[1] = Math.sin(this.meshInstances[i+4])*Math.sin(this.meshInstances[i+5])*Math.cos(this.meshInstances[i+3])-Math.sin(this.meshInstances[i+3])*Math.cos(this.meshInstances[i+5]);
                rotMatrix[2] = Math.sin(this.meshInstances[i+4])*Math.cos(this.meshInstances[i+5])*Math.cos(this.meshInstances[i+3])+Math.sin(this.meshInstances[i+3])*Math.sin(this.meshInstances[i+5]);
                rotMatrix[3] = Math.cos(this.meshInstances[i+4])*Math.sin(this.meshInstances[i+3]);
                rotMatrix[4] = Math.sin(this.meshInstances[i+3])*Math.sin(this.meshInstances[i+4])*Math.sin(this.meshInstances[i+5])+Math.cos(this.meshInstances[i+3])*Math.cos(this.meshInstances[i+5]);
                rotMatrix[5] = Math.sin(this.meshInstances[i+4])*Math.cos(this.meshInstances[i+5])*Math.sin(this.meshInstances[i+3])-Math.sin(this.meshInstances[i+5])*Math.cos(this.meshInstances[i+3]);
                rotMatrix[6] = -1*Math.sin(this.meshInstances[i+4]);
                rotMatrix[7] = Math.sin(this.meshInstances[i+5])*Math.cos(this.meshInstances[i+4]);
                rotMatrix[8] = Math.cos(this.meshInstances[i+4])*Math.cos(this.meshInstances[i+5]);
            //}
            //Actual mesh object referred to via this.meshList[this.meshInstances[i+6]]
            //if the mesh is in view (store meshInstance in meshInstancesInView), transform it's vertices(store), then sort it's frontward facing faces from closest vertex to farthest vertex(store). 
            //sort meshInstancesInView accoring to their closest vertex, for each meshInstance in the resulting array draw faces, mapping to transformed verecies, in order
            
            //You crazy but u kinda cool
            for (var j=0;j<3;j++){
                cameraLeft[j] = cameraUp[(j+1)%3]*cameraDirection[(j+2)%3] - cameraUp[(j+2)%3]*cameraDirection[(j+1)%3];
            }
            //HoboMath.cross(cameraUp, cameraDirection, crossProdResutlt, 0);
            var z = Math.sqrt(cameraDirection[0]*(this.meshInstances[i]-cameraPosition[0])+cameraDirection[1]*(this.meshInstances[i+1]-cameraPosition[1])+cameraDirection[2]*(this.meshInstances[i+2]-cameraPosition[2]));
            var theta = Math.PI/4;

            //Find meshes certainly in front of our camera view, i.e. Clulling the ones behind
            if (z + this.meshList[this.meshInstances[i+6]].maxWidth > 0){
                //Find meshes in our feild of view, accounting for their width
                if ((width/2 + z*Math.sin(theta) + this.meshList[this.meshInstances[i+6]].maxWidth > Math.abs(cameraLeft[0]*(this.meshInstances[i]-cameraPosition[0])+cameraLeft[1]*(this.meshInstances[i+1]-cameraPosition[1])+cameraLeft[2]*(this.meshInstances[i+2] - cameraPosition[2]))) && (height/2 + z*Math.sin(theta) + this.meshList[this.meshInstances[i+6]].maxWidth > Math.abs(cameraUp[0]*(this.meshInstances[i]-cameraPosition[0])+cameraUp[1]*(this.meshInstances[i+1] - cameraPosition[1])+cameraUp[2]*(this.meshInstances[i+2] - cameraPosition[2])))){ 
                    var verticiesOffset = renderVertices.size/3;
                    //transform all vertices to camera space, acconting for meshPositon
                    for (var j=0;j<this.meshList[this.meshInstances[i+6]].vertices.size;j+=3){
                        //represents vertex after being rotated
                        rotArray[0]=this.meshList[this.meshInstances[i+6]].vertices.array[j]*rotMatrix[0] + this.meshList[this.meshInstances[i+6]].vertices.array[j+1]*rotMatrix[1] +  this.meshList[this.meshInstances[i+6]].vertices.array[j+2]*rotMatrix[2];
                        rotArray[1]=this.meshList[this.meshInstances[i+6]].vertices.array[j]*rotMatrix[3] + this.meshList[this.meshInstances[i+6]].vertices.array[j+1]*rotMatrix[4] +  this.meshList[this.meshInstances[i+6]].vertices.array[j+2]*rotMatrix[5];
                        rotArray[2]=this.meshList[this.meshInstances[i+6]].vertices.array[j]*rotMatrix[6] + this.meshList[this.meshInstances[i+6]].vertices.array[j+1]*rotMatrix[7] +  this.meshList[this.meshInstances[i+6]].vertices.array[j+2]*rotMatrix[8];
                        //cameraLeft[0]*(rotArray[0] + this.meshInstances[i] - cameraPosition[0])
                        //check scaling as item moves away from camera
                        z = cameraDirection[0]*(rotArray[0] + this.meshInstances[i] - cameraPosition[0]) + cameraDirection[1]*(rotArray[1] + this.meshInstances[i+1] - cameraPosition[1]) + cameraDirection[2]*(rotArray[2] + this.meshInstances[i+2] - cameraPosition[2]);
                        renderVertices.push((cameraLeft[0]*(rotArray[0] + this.meshInstances[i] - cameraPosition[0]) + cameraLeft[1]*(rotArray[1] + this.meshInstances[i+1] - cameraPosition[1]) + cameraLeft[2]*(rotArray[2] + this.meshInstances[i+2] - cameraPosition[2]))/(width/2 + z*Math.sin(theta)));
                        renderVertices.push((cameraUp[0]*(rotArray[0] + this.meshInstances[i] - cameraPosition[0]) + cameraUp[1]*(rotArray[1] + this.meshInstances[i+1] - cameraPosition[1]) + cameraUp[2]*(rotArray[2] + this.meshInstances[i+2] - cameraPosition[2]))/(height/2 + z*Math.sin(theta)));
                        renderVertices.push(z);
                        //Rotation matrix applied to renderVertices
                    }
                    for (var j=0;j<this.meshList[this.meshInstances[i+6]].faces.size;j+=4){
                        //THIS IS THE PROBLEM -- Removed if faceprog > 0 and saw everything
                        //HoboMath.cross(threeMinusOne, threeMinusTwo, crossProdResutlt,0);
                        
                        faceNormal[0] = (this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j+1]+1] - this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j]+1])*(this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j+2]+2] - this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j]+2]) - (this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j+1]+2] - this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j]+2])*(this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j+2]+1] - this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j]+1]);
                        faceNormal[1] = (this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j+1]+2] - this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j]+2])*(this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j+2]]   - this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j]]) - (this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j+1]]   - this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j]])*(this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j+2]+2] - this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j]+2]);
                        faceNormal[2] = (this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j+1]]   - this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j]])*(this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j+2]+1] - this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j]+1]) - (this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j+1]+1] - this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j]+1])*(this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j+2]]   - this.meshList[this.meshInstances[i+6]].vertices.array[3*this.meshList[this.meshInstances[i+6]].faces.array[j]]);
                        rotArray[0] = faceNormal[0]*rotMatrix[0] + faceNormal[1]*rotMatrix[1] + faceNormal[2]*rotMatrix[2];
                        rotArray[1] = faceNormal[0]*rotMatrix[3] + faceNormal[1]*rotMatrix[4] + faceNormal[2]*rotMatrix[5];
                        rotArray[2] = faceNormal[0]*rotMatrix[6] + faceNormal[1]*rotMatrix[7] + faceNormal[2]*rotMatrix[8];
                        var faceProj = -1*(rotArray[0]*cameraDirection[0] + rotArray[1]*cameraDirection[1] + rotArray[2]*cameraDirection[2])/Math.sqrt(rotArray[0]*rotArray[0] + rotArray[1]*rotArray[1] + rotArray[2]*rotArray[2]);
                        if (faceProj > 0){
                            renderFaces.push(verticiesOffset + this.meshList[this.meshInstances[i+6]].faces.array[j]);
                            renderFaces.push(verticiesOffset + this.meshList[this.meshInstances[i+6]].faces.array[j+1]);
                            renderFaces.push(verticiesOffset + this.meshList[this.meshInstances[i+6]].faces.array[j+2]);
                            renderFaces.push((this.meshList[this.meshInstances[i+6]].faces.array[j+3]&0xFF000000)|(((((this.meshList[this.meshInstances[i+6]].faces.array[j+3]&0x00FF0000) >> 16)*faceProj) >> 0) << 16)|(((((this.meshList[this.meshInstances[i+6]].faces.array[j+3]&0x0000FF00) >> 8)*faceProj) >> 0) << 8)|(((this.meshList[this.meshInstances[i+6]].faces.array[j+3]&0x000000FF)*faceProj) >> 0));
                        }
                    }
                }
            }
        }

        HoboMath.painsort(renderFaces, renderVertices, renderSortbuddy);    //Using the qth set of renderVertices as the values, sort renderFaces
        //Draw to canvas
        var pixelWidth = context.canvas.clientWidth;
        var pixelHeight = context.canvas.clientHeight;
        context.translate(pixelWidth/2, pixelHeight/2);
        for (var i=0;i<renderFaces.size;i+=4){
            //context.lineWidth=3;    //LARGE LINES
            context.beginPath();
            context.moveTo((pixelWidth/2)*renderVertices.array[3*renderFaces.array[i]], -1*(pixelHeight/2)*renderVertices.array[3*renderFaces.array[i] + 1]);
            context.lineTo((pixelWidth/2)*renderVertices.array[3*renderFaces.array[i + 1]], -1*(pixelHeight/2)*renderVertices.array[3*renderFaces.array[i + 1] + 1]);
            context.lineTo((pixelWidth/2)*renderVertices.array[3*renderFaces.array[i + 2]], -1*(pixelHeight/2)*renderVertices.array[3*renderFaces.array[i + 2] + 1]);
            context.closePath();
            context.fillStyle = 'rgba(' + ((renderFaces.array[i + 3]&0x00FF0000) >> 16).toString() + ',' + ((renderFaces.array[i + 3]&0x0000FF00) >> 8).toString() + ',' + (renderFaces.array[i + 3]&0x000000FF).toString() + ',' + (((renderFaces.array[i + 3]&0xFF000000) >>> 24)/255).toString() + ')';
            context.fill();          
        }
    }
    
}

// Object that transforms world space relative to its position
//--------------------------------------------------------------------------------
//---- Prototype: World
//---- Object   : Camera
//----              |->position     - Displacement of camera
//----              |->forward      - Forward unit vector
//----              |->up           - Up unit vector
//--------------------------------------------------------------------------------
function Camera(position, forward, up, width, height){
    this.prototype = World;
    this.position = position;
    this.forward = forward;
    this.up = up;
    this.width = width;
    this.height = height;
}


/*  TODO 
Create camera objects which updates every 60 times per second
Create handy movable camera with keyboard/ mouse control
    scroll moves away/towards
    drag turns
    keyboard, arrows move forward, back, turn left, turn right
Create entitiy object which hold mesh info along with other info
that might be used by future engines (i.e. skeleton for physics engine)
*/