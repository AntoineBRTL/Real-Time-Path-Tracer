#version 300 es
precision mediump float;

in vec3 vertexPosition;

out mat4 cameraRotationMatrix;
uniform float cameraRotationX;
uniform float cameraRotationY;
uniform float cameraRotationZ;

mat4 rotationMatrix(vec3 axis, float angle)
{
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                0.0,                                0.0,                                0.0,                                1.0);
}

void main(){

    cameraRotationMatrix = rotationMatrix(vec3(1.0, 0.0, 0.0), cameraRotationX * 3.14/180.0) * rotationMatrix(vec3(0.0, 1.0, 0.0), cameraRotationY * 3.14/180.0) * rotationMatrix(vec3(0.0, 0.0, 1.0), cameraRotationZ * 3.14/180.0);
    gl_Position = vec4(vertexPosition, 1.0);
}