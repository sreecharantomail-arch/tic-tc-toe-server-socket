from pathlib import Path

path = Path(r"c:\Users\Administrator\Downloads\ttt never change\tic tac toe update 3\tic tc toe srver backup\tic tc toe server socket\public\index.html")
text = path.read_text(encoding="utf-8")

start = text.find("<!DOCTYPE html>")
if start == -1:
    raise SystemExit("DOCTYPE not found")

end = text.find("</html>", start)
if end == -1:
    raise SystemExit("closing html not found")
end += len("</html>")

text = text[start:end]
text = text.replace('id = "', 'id="')
text = text.replace('type="button"class=', 'type="button" class=')
text = text.replace('type="button" class=', 'type="button" class=')

path.write_text(text, encoding="utf-8")
print("rewritten", path)
