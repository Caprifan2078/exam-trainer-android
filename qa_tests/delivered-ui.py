import subprocess,xml.etree.ElementTree as ET,re,time

def adb(*x):return subprocess.run(['adb',*x],check=True,stdout=subprocess.PIPE,text=True).stdout

def dump():
 adb('shell','uiautomator','dump','/sdcard/window.xml');return ET.fromstring(adb('shell','cat','/sdcard/window.xml'))

def txt(e):return ' '.join((e.attrib.get('text',''),e.attrib.get('content-desc','')))
def bounds(e):
 m=re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',e.attrib.get('bounds',''))
 return tuple(map(int,m.groups())) if m else (0,0,0,0)
def valid(e):
 a,b,c,d=bounds(e);return c>a and d>b
root=dump(); text=' '.join(txt(e) for e in root.iter())
if 'Экзаменатор' not in text:raise Exception('Home title not present: '+text[:3000])
size=adb('shell','wm','size');m=re.search(r'(\d+)x(\d+)',size);w,h=map(int,m.groups())
for _ in range(4):
 root=dump();buttons=[e for e in root.iter() if 'Создать случайный вариант' in txt(e) and valid(e)]
 if buttons:break
 adb('shell','input','swipe',str(w//2),str(int(h*.82)),str(w//2),str(int(h*.30)),'500');time.sleep(1)
if not buttons:raise Exception('Visible create button not found: '+' '.join(txt(e) for e in root.iter())[:3000])
x1,y1,x2,y2=bounds(buttons[0]);adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(5)
root=dump();text=' '.join(txt(e) for e in root.iter());open('qa-evidence/work.xml','w').write(ET.tostring(root,encoding='unicode'))
if 'К выбору задания' not in text or 'Расчёт начальной' not in text:raise Exception('Task not opened: '+text[:4000])
print('PASS: create button tapped and NMCK task UI opened')
