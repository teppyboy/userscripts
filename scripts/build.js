import * as fs from "node:fs";

const OUT_DIR = "./dist";

for (const path of fs.readdirSync("./src/")) {
	console.log(`Begin building files in '${path}'...`);
	for (const file of fs.readdirSync(`./src/${path}`)) {
		console.log(`Building file '${path}/${file}'...`);
		await Bun.build({
			entrypoints: [`./src/${path}/${file}`],
			outdir: `${OUT_DIR}/${path}`,
			minify: true
		});
		// Add the UserScript header to the file
		const data = fs.readFileSync(`./src/${path}/${file}`, "utf8");
		let userScriptHeader = "";
		let userScriptHeaderFound = false;
		for (const line of data.split("\n")) {
			if (line.startsWith("// ==UserScript==")) {
				userScriptHeaderFound = true;
			}
			if (userScriptHeaderFound) {
				userScriptHeader += `${line}\n`;
				if (line.startsWith("// ==/UserScript==")) {
					break;
				}
			}
		}
		const outFileName = file.replace(".ts", ".js");
		const outText = fs.readFileSync(`${OUT_DIR}/${path}/${outFileName}`, "utf8");
		fs.writeFileSync(
			`${OUT_DIR}/${path}/${outFileName}`,
			`${userScriptHeader}${outText}`,
		);
	}
}
console.log("Build complete!");
