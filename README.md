# SimpleParticle
Simple Particle ���� �򵥵�����ϵͳ��֧�� dom �� canvas ģʽ����̬��������λ�á��ٶȡ��������ɫ��

###options###
```html
mode: "dom",//dom || canvas
clearCanvas: true,//mode=canvasʱ��ÿ�θ����Ƿ����canvas
auto: true,//�Ƿ��Զ���ʼ
particlesNum: 10000,//���������
duration: 20,//�������Ƶ��
effectors: [],//�Զ���Ч������ function(...){this.apply = function(particle){}}}
particle: {
    position: null,//��ʼλ������[x,y]��Ĭ�����������λ��,��ָ�������Χ��:[[100,200], [10,30]]��Ĭ����������
    speed: [100, 100],//��ʼx,y�ٶȴ�С����[vx,vy],Ĭ��[100, 500]�������ָ�������Χ��:[[100,200], [10,30]]
    color: "random",//[R,G,B],��ʼ��ɫ��Ĭ���������ָ�������Χ��:[[0,0,1], [1,0,0]]��["white", "red"]
    angle: [0, Math.PI * 2],//��ʼx,y�ٶȷ��򣬷�Χ0-2��,Ĭ��0-2�����
    life: 2, //�������ڣ��룩����ʼ����0
    size: 8,//��ʼ��С
    nodeStyle: "position: absolute;border-radius:4px;"//mode=dom��Ч
},
gravity: [0, 100],//(x,y)����
acceleration: [0, 100],//���ٶȣ��ɱ�
initEmtr: null,//��ʼ�����������������������������������x,y������ʼ(0,0)��������չ����
emtrTrail: null,//���ӷ���Դ�˶��켣��������ʱ���� position ��ʼֵ������������:��SimpleParticle����,�������������)
onStart: null//ÿ����Ⱦǰִ�еĺ�����������this��SimpleParticle����
```
###method###
+ start/stop/pause/resume/toggle();//ϵͳ��ʼ/ֹͣ/��ͣ/�ָ�/toggle

###snapshot###
![image](snapshot/test.png)

###demo###
See [here](http://tt-cc.cn/front-end/jquery-plugins/particle)