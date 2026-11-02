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

nav=[e for e in root.iter() if 'Переход по расчётным ячейкам' in txt(e) and valid(e)]
zoom=[e for e in root.iter() if 'Уменьшить таблицу' in txt(e) and valid(e)]
if not nav or not zoom: raise Exception('Mobile navigation or zoom not visible')
if bounds(nav[0])[3]>bounds(zoom[0])[1]: raise Exception('Navigation overlaps zoom: '+str((bounds(nav[0]),bounds(zoom[0]))))
print('PASS: mobile navigation and zoom do not overlap')
prices=[txt(e) for e in root.iter() if 'КП:' in txt(e)]
if not prices:raise Exception('Source prices not found')
m=re.search(r'КП:\s*([\d\s\u00a0\u202f]+)',prices[0]);price=re.sub(r'\s','',m.group(1)) if m else ''
if not price.isdigit():raise Exception('Cannot parse source price')
inputs=[e for e in root.iter() if e.attrib.get('class')=='android.widget.EditText' and valid(e)]
if not inputs:raise Exception('Formula input not visible')
x1,y1,x2,y2=bounds(inputs[0]);adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));adb('shell','input','text',price);adb('shell','input','keyevent','4');time.sleep(1)
root=dump();buttons=[e for e in root.iter() if 'Применить формулу' in txt(e) and valid(e)]
if not buttons:raise Exception('Save button not visible')
x1,y1,x2,y2=bounds(buttons[0]);adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(2)
root=dump();text=' '.join(txt(e) for e in root.iter());open('qa-evidence/after-input.xml','w').write(ET.tostring(root,encoding='unicode'))
if 'Заполнено 1 из' not in text:raise Exception('Entering first price did not update progress: '+text[:4000])
print('PASS: price entered and progress updated')

# Exercise the real autocomplete UI on the numeric cell without committing the test formula.
root=dump(); fields=[e for e in root.iter() if e.attrib.get('class')=='android.widget.EditText' and valid(e)]
if not fields:raise Exception('Formula input not found for autocomplete')
x1,y1,x2,y2=bounds(fields[0]);adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
adb('shell','input','keyevent','KEYCODE_MOVE_END')
for _ in range(16):adb('shell','input','keyevent','KEYCODE_DEL')
adb('shell','input','text','=AV');time.sleep(2);adb('shell','input','keyevent','4');time.sleep(1)
root=dump(); choices=[e for e in root.iter() if 'AVERAGE' in txt(e) and valid(e)]
if not choices:raise Exception('AVERAGE suggestion is not visible: '+' '.join(txt(e) for e in root.iter())[:4000])
x1,y1,x2,y2=bounds(choices[0]);adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(2)
root=dump();fields=[e for e in root.iter() if e.attrib.get('class')=='android.widget.EditText' and valid(e)]
if not fields or '=AVERAGE(' not in txt(fields[0]):raise Exception('Selected function was not inserted: '+' '.join(txt(e) for e in root.iter())[:4000])
print('PASS: Android function suggestion displayed and inserted')
