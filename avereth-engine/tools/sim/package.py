"""Create a minimal, offline Node bundle from an explicit allowlist, never chats/secrets/history."""
import pathlib, zipfile, sys, json
root=pathlib.Path(__file__).resolve().parents[2]
out=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else 'Avereth_Combat_Simulator_10B.zip').resolve()
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for folder in ['src','content','tools/sim']:
  for p in sorted((root/folder).rglob('*')):
   if p.is_file() and p.suffix in ['.js','.mjs','.json','.md','.py']:
    z.write(p,p.relative_to(root))
 package=json.loads((root/'package.json').read_text())
 z.writestr('package.json',json.dumps({'name':'avereth-combat-simulator','private':True,'type':'module','version':package['version'],'engines':{'node':'>=22'},'scripts':{'sim:combat':'node tools/sim/combat.mjs'}},indent=2))
 z.write(root/'tools/sim/README.md','README.md')
print(out)
