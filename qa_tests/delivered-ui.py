import subprocess,xml.etree.ElementTree as ET,re,time,sys

def adb(*x):return subprocess.run(['adb',*x],check=True,stdout=subprocess.PIPE,text=True).stdout

def dump():
 adb('shell','uiautomator','dump','/sdcard/window.xml');return ET.fromstring(adb('shell','cat','/sdcard/window.xml'))

def txt(e):return ' '.join((e.attrib.get('text',''),e.attrib.get('content-desc','')))
root=dump(); text=' '.join(txt(e) for e in root.iter());
if 'Экзаменатор' not in text:raise Exception('Home title not present: '+text[:3000])
buttons=[e for e in root.iter() if 'Создать случайный вариант' in txt(e)]
if not buttons:
 adb('shell','input','swipe','500','1500','500','450','600');time.sleep(2);root=dump();buttons=[e for e in root.iter() if 'Создать случайный вариант' in txt(e)]
if not buttons:raise Exception('Create button not found: '+' '.join(txt(e) for e in root.iter())[:3000])
m=re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',buttons[0].attrib['bounds']);x1,y1,x2,y2=map(int,m.groups());adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(5)
root=dump();text=' '.join(txt(e) for e in root.iter());open('qa-evidence/work.xml','w').write(ET.tostring(root,encoding='unicode'))
if 'НМЦК' not in text or ('ячей' not in text.lower() and 'формул' not in text.lower()):raise Exception('Task UI missing: '+text[:4000])
print('PASS: home and task UI visible')
