// RAIL LICENSE GENERATOR
// Jesse Josua Benjamin, Scott Cambo, Tim Korjakow
// WG "Tooling & Procedural Governance"
// RAIL Initative
// https://licenses.ai
// MIT License

// This frontend prototype (RAIL License Generator v1) uses the following libraries:
// html2canvas by Niklas von Hertzen. https://html2canvas.hertzen.com/. Licensed under the MIT License.
// materialize.css by Alvin Wang, Alan Chang, Alex Mark and Kevin Louie. https://materializecss.com/. Licensed under the MIT License.

// This document is structured as follows:
// 1. Global Variables
// 2. Server Functions
// 4. Startup Functions
// 5. UI Functions
// 6. Download Functions

//////////////////////////
// 1. Global Variables
//////////////////////////

// API Paths

// For local dev (use port 3000!)
// const url = "http://localhost/api/v1/license/";

// For deployment
const url = "//api.generator.licenses.ai/api/v1/license/";

const restrictionPath = 'restriction/';
const domainPath = 'domain/';
const sourcePath = 'source/';

// Specify the Mandatory Use Restrictions (i.e. pre-selected) source using we're looking for with the sourceSearch variable
// Here, we want to get the "RAIL Initiative" id to filter the incoming restrictions (see line 225)
// Full List v1
// {id: 1, name: 'Stable Diffusion'}
// {id: 2, name: 'AI Pubs'}
// {id: 3, name: 'Llama2'}
// {id: 4, name: 'Big Code'}
// {id: 5, name: 'RAIL Initiative'}
// {id: 6, name: 'AI2 Impact'}
// {id: 7, name: 'LLama2'}
let sourceSearch = "RAIL Initiative";

// Variables for final License construction, default is OpenRAIL 
let selectedLicenseType = 'OpenRAIL';
let specification = { length: 0, data: false, application: false, model: false, sourcecode: false };
let permissions = {derivatives: true, researchOnly: false};
let artefact_s = '';
let specifiedDomains = [];
let licenseLog = {};

// Variables for UI Events
let agreed = false;
let named = false;
let picked = false;
let downloadReady = false;

//////////////////////////
// 2. Server Functions
//////////////////////////


// Use any path to check the backend is up and running
async function backendAvailable() {
	try {
		let response = await fetch(url + domainPath, {
			method: 'GET',
			mode: 'cors'
		});

		return response;
	} catch (error){
		console.log(error.message);
	}
}

// Retrieve available restrictions, domains, and sources from the backend (processed in line 216)
async function getData() {
	try {
		let restrictionFetch = await fetch(url + restrictionPath, {
			method: 'GET',
			mode: 'cors',
			headers: {
				'Content-Type': 'application/json',
			},
		});
		let domainFetch = await fetch(url + domainPath, {
			method: 'GET',
			mode: 'cors',
			headers: {
				'Content-Type': 'application/json',
			},
		});
		let sourceFetch = await fetch(url + sourcePath, {
			method: 'GET',
			mode: 'cors',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		let restrictions = await restrictionFetch.json();
		let domains = await domainFetch.json();
		let sources = await sourceFetch.json();

		processResponse(restrictions, domains, sources);
	} catch (error){
		console.log(error.message);
	}
}

// Post the generated license to the backend
async function postLicense() {

	document.getElementById('previewTooltip').style.display = "none";

	const timestamp = new Date();

	let restrictionsListHTML = document.getElementById('restrictionsMasterList').getElementsByClassName('restriction');
	let restrictionsList = Array.prototype.slice.call(restrictionsListHTML);
	console.log(restrictionsList);
	let specificationString = '';
	let restriction_ids = [];

	if(Object.values(specification).includes(true)) {
		let specificationParent = document.getElementById('specificationParent');

		for(let i = 1; i < specificationParent.children.length; i++) {
			if(specificationParent.children[i].style.display === "inline") {
				specificationString += specificationParent.children[i].innerText;
			}
		}
	}

	// License Object
	licenseLog = {
		"timestamp": timestamp.toISOString(),
		"name": artefact_s.toString(),
		"artifact": specificationString.toString(),
		"license": selectedLicenseType.toString(),
		"data": specification.data,
		"application": specification.application,
		"model": specification.model,
		"sourcecode": specification.sourcecode
	}

	if(restrictionsList.length > 0) {
		for(let child of restrictionsList) {
			restriction_ids.push(parseInt(child.dataset.id));
		}
	}

	licenseLog.restriction_ids = restriction_ids;

	// console.log(JSON.stringify(licenseLog));

	try {
		let response = await fetch(url, {
			method: 'POST',
			mode: 'cors',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(licenseLog)
		});
		
		// Handle Rate Limiting
		if (response.status_code == 429) {
			alert(response.json()["detail"]);
		} else {
			let license = await response.json();

			document.getElementById('download').dataset.id = license.id;
			downloadReady = true;
		}
	} catch (error){
		console.error(error + " " + error.message);
	}
}

//////////////////////////
// 3. Startup Functions
//////////////////////////

function isLocalhost(url) {
	return url.includes('localhost') || url.includes('127.0.0.1');
}


function init(el) {
	console.log('Initializing');
	getData();

	// Initialize Materialize
	M.AutoInit();
}

window.addEventListener("load", (event) => {
	if (window.location.protocol == 'http:' && !isLocalhost(window.location.href)) {          

		console.log("https forced");
		window.location.href = window.location.href.replace('http:', 'https:');

	} else if (window.location.protocol == "https:" || isLocalhost(window.location.href)) {
		backendAvailable().then((response) => {
			if(response.status == '200') {
				var elems = document.querySelectorAll('.modal');
				let options = {
					onCloseEnd: init(this),
					dismissible: false
				};
				var instances = M.Modal.init(elems, options);
				instances[0].open();
			}
		});
	}
});

function processResponse(r, d, s) {
	let collectionLockedRestrictions = [];
	let additionalRestrictions = document.getElementById('additionalRestrictions');

	//Identify the source of mandatory restrictions (specified by sourceSearch variable) by their ID in the sources array
	let sourceObj = s.find(o => o.name === sourceSearch);
	const lock = sourceObj.id;

	//Add domains (d) as options to select element
	for (let child of d) {
		let option = document.createElement('option');
		option.value = child.name.toString();
		option.innerHTML = child.name.toString();

		additionalRestrictions.appendChild(option);
	}

	M.FormSelect.init(additionalRestrictions);

	//Parse restrictions (r), if a restriction's source id matches the lock variable (line 225) treat them separately
	for (let child of r) {
		if(child.source_id === lock) {
			collectionLockedRestrictions.push(child);
		} else {
			let additionalRestriction = document.createElement('p');
			additionalRestriction.classList.add(d[child.domain_id-1].name.toString());

			let label = document.createElement('label');
			let span = document.createElement('span');
			span.innerHTML = child.text.toString();

			let chip1 = document.createElement('div');
			chip1.classList.add('chip');
			chip1.innerHTML = s[child.source_id-1].name.toString();
			span.appendChild(chip1);


			let chip2 = document.createElement('div');
			chip2.classList.add('chip');
			chip2.classList.add('domain');
			chip2.innerHTML = d[child.domain_id-1].name.toString();
			span.appendChild(chip2);

			label.appendChild(span);

			let input = document.createElement('input');
			input.type = 'checkbox';
			input.dataset.domain = d[child.domain_id-1].name.toString();
			input.dataset.domain_id = d[child.domain_id-1].id;
			input.dataset.id = child.id;
			input.dataset.restriction = child.text.toString();
			input.onclick = function(event) {
				event.stopImmediatePropagation();
				processRestriction(this);
			};

			label.insertBefore(input, label.firstChild);
			additionalRestriction.appendChild(label);

			additionalRestriction.style.display = 'none';

			document.getElementById('domainChoice').appendChild(additionalRestriction);
		}
	}

	processLockedRestrictions(collectionLockedRestrictions, d);
}

function processLockedRestrictions(clr, d) {
	let domains = [];
	let restrictionsList = document.getElementById('restrictionsMasterList');
	let banner = document.getElementById('banner');

	// If the locked restrictions (clr) come from "RAIL Initiative", add the RAIL logo to the image banner
	if(sourceSearch === "RAIL Initiative") {
		let div = document.createElement('div');
		div.id = "RAILInitative";
		div.classList.add('banner-img');
		let img = document.createElement('img');
		img.src = './assets/RAIL.png';
		img.title = 'RAIL Initiative Restrictions';
		img.alt = 'RAIL Initiative Restrictions';
		div.appendChild(img);
		banner.appendChild(div);
	}

	for(let i = 0; i < clr.length; i++) {
		domains.push(clr[i].domain_id);
	}

	domains = [... new Set(domains)];
	
	for(let i = 0; i < domains.length; i++) {
		let li = document.createElement('li');
		li.innerHTML = d[parseInt(domains[i])-1].name;

		let ol = document.createElement('ol');
		ol.type = "a";
		ol.id = d[parseInt(domains[i])-1].name + "Restrictions";
		ol.dataset.domain = d[parseInt(domains[i])-1].name;

		let div = document.createElement('div');
		div.id = ol.dataset.domain.toString();
		div.classList.add('banner-img');
		let img = document.createElement('img');
		img.src = './assets/' + ol.dataset.domain.toString() + '.png';
		img.title = ol.dataset.domain.toString() + " Restrictions";
		img.alt = ol.dataset.domain.toString() + " Restrictions";
		div.appendChild(img);
		banner.appendChild(div);

		for(let j = 0; j < clr.length; j++) {
			if(clr[j].domain_id === domains[i]) {
				let restriction = document.createElement('li');
				restriction.innerHTML = clr[j].text.toString();
				restriction.dataset.domain_id = clr[j].domain_id;
				restriction.dataset.domain = d[parseInt(clr[j].domain_id-1)].name;
				restriction.dataset.id = clr[j].id;
				restriction.dataset.restriction = clr[j].text.toString();
				restriction.classList.add('restriction');
				ol.appendChild(restriction);
			}
		}

		li.appendChild(ol);
		restrictionsList.appendChild(li);
	}
}

//////////////////////////
// 4. UI Functions
//////////////////////////


function checkModal(el) {
	let input = document.getElementById('artefacts_inline').value;
	
	if(el.children[0].classList.contains('disabled') && (!named || input.length <= 1)) {
		M.toast({html: 'Provide a name to proceed!'});
	}
}

function processDomain(el) {
	let domains = document.getElementById('domainChoice');

	for(let restriction of domains.children) {
		if(restriction.className == el.value) {
			restriction.style.display = "block";
		} else {
			restriction.style.display = "none";
		}
	}
}

function processRestriction(el) {
	let restrictionsList = document.getElementById('restrictionsMasterList');
	let previewDomainList = document.getElementById(el.dataset.domain + "Restrictions");

	if(previewDomainList) {
		if(el.checked) {
			let restriction = document.createElement('li');
			restriction.innerHTML = el.dataset.restriction.toString();
			restriction.dataset.domain_id = el.dataset.domain_id;
			restriction.dataset.domain = el.dataset.domain;
			restriction.dataset.id = el.dataset.id;
			restriction.dataset.restriction = el.dataset.restriction.toString();
			restriction.classList.add('restriction');
			previewDomainList.appendChild(restriction);
		} else if (!el.checked) {
			for(let child of previewDomainList.children) {
				if(el.dataset.id === child.dataset.id) {
					console.log("Remove restriction");
					previewDomainList.removeChild(child);

					if(previewDomainList.children.length === 0) {
						console.log("Remove domain list");
						previewDomainList.parentNode.remove()
						document.getElementById(child.dataset.domain).remove();
					}
				} else {
					continue;
				}
			}
		}
	} else {
		if(el.checked) {
			console.log("Create domain list");
			let newDomainItem = document.createElement('li');
			newDomainItem.innerHTML = el.dataset.domain;

			let newDomainRestrictionList = document.createElement('ol');
			newDomainRestrictionList.type = "a";
			newDomainRestrictionList.id = el.dataset.domain + "Restrictions";
			newDomainRestrictionList.dataset.domain = el.dataset.domain;

			console.log("Create first restriction");
			let restriction = document.createElement('li');
			restriction.innerHTML = el.dataset.restriction.toString();
			restriction.dataset.domain_id = el.dataset.domain_id;
			restriction.dataset.domain = el.dataset.domain;
			restriction.dataset.id = el.dataset.id;
			restriction.dataset.restriction = el.dataset.restriction.toString();
			restriction.classList.add('restriction');
			newDomainRestrictionList.appendChild(restriction);

			newDomainRestrictionList.appendChild(restriction);
			newDomainItem.appendChild(newDomainRestrictionList);
			restrictionsList.appendChild(newDomainItem);

			console.log("Add icon");
			let div = document.createElement('div');
			div.id = el.dataset.domain.toString();
			div.classList.add('banner-img');
			let img = document.createElement('img');
			img.src = './assets/' + el.dataset.domain + '.png';
			div.appendChild(img);
			banner.appendChild(div);

			specifiedDomains.push(el.dataset.domain);
		}
	}
}

function processLicenseChoice(el) {
	document.getElementById("license-type").innerHTML = el.dataset.license.toString();
	selectedLicenseType = el.dataset.license.toString();

	let cards = document.getElementsByClassName('card');
	let cardsContent = document.getElementsByClassName('card-content');

	for(let i = 0; i < cards.length; i++) {
		if(i == el.dataset.index) {
			cards[i].classList.remove('lighten-2');
			cards[i].classList.add('lighten-5');
			cardsContent[i].dataset.active = true;
		} else {
			cards[i].classList.remove('lighten-5');
			cards[i].classList.add('lighten-2');
			cardsContent[i].dataset.active = false;
		}
	}

	checkCondition(el.dataset.index);

	picked = true;
}

function processNaming(el) {
	if(el.toString().length > 0) {
		document.getElementById('artefact_title').innerHTML = el.toString();
		named = true;
		artefact_s = el.toString();
		if(named) {
			document.getElementById('modal-agree').classList.remove('disabled'); 
		}
	}
}

function processSpecification(el) {
	let specificationParent = document.getElementById('specificationParent');

	if(el.checked) {
		if(specification.length === 0) {
			console.log("Add first specification");
			specificationParent.children[0].style.display = "inline";
			specificationParent.children[el.dataset.order].style.display = "inline";
			specification.length = 1;
			specification[el.dataset.specification] = true;
		} else if (specification.length >= 1) {
			specificationParent.children[el.dataset.order].style.display = "inline";
			specification[el.dataset.specification] = true;
			specification.length++;
		}
	} else if (!el.checked) {
		console.log("Remove specification");
		specificationParent.children[el.dataset.order].style.display = "none";
		specification.length--;
		specification[el.dataset.specification] = false;

		if(specification.length === 0) {
			specificationParent.children[0].style.display = "none";
			specification.length = 0;
		}
	}
}

function processPermission(el) {
	let permission = document.getElementById(el.dataset.permission.toString());
	document.getElementById("license-type").innerHTML = el.dataset.license.toString();

	if(el.checked) {
		permission.innerHTML = el.dataset.copy.toString() + "&#10003;";
		permissions[el.dataset.permission] = true;
	} else if (!el.checked) {
		permission.innerHTML = '';
		permissions[el.dataset.permission] = false;
	}

	checkCondition(el.dataset.index);
}

function checkCondition(i) {
	let conditionSwitches = Array.prototype.slice.call(document.getElementsByClassName("condition"));
	let licenseCards = Array.prototype.slice.call(document.getElementsByClassName("card-content"));
	let conditionArray = conditionSwitches.concat(licenseCards);

	for(let item of conditionArray) {
		if(item.dataset.index === i) {
			if(item.nodeName === "INPUT") {
				document.getElementById(item.dataset.permission.toString()).innerHTML = item.dataset.copy.toString() + " &#10003;";
				permissions[item.dataset.permission] = true;
				item.checked = true;
			} else if (item.nodeName === "DIV") {
				item.parentElement.classList.remove('lighten-2');
				item.parentElement.classList.add('lighten-5');
				selectedLicenseType = item.dataset.license.toString();
			}
		} else {
			if(item.nodeName === "INPUT") {
				item.checked = false;
				document.getElementById(item.dataset.permission.toString()).innerHTML = item.dataset.copy.toString() + " &#215;";
				permissions[item.dataset.permission] = false;
			} else if (item.nodeName === "DIV") {
				item.parentElement.classList.remove('lighten-5');
				item.parentElement.classList.add('lighten-2');
			}
		}
	}
}

function showPage(el){
	let pages = document.getElementById('pages');
	let pagination = document.getElementById('paginationLinks').children;
	let progress = document.getElementById('progressBar');
	let blink = document.getElementById('blink');
	let active = el.dataset.link;

	progress.style.width = el.dataset.progress + "%";

	for (let child of pages.children) {
		if(child.id != active.toString()) {
			child.style.display = 'none';
		} else {
			console.log(child.id + " is active.")
			child.style.display = 'block';
			if(child.id === "finish") {
				blink.style.visibility = "hidden";
				postLicense();
			} else {
				blink.style.visibility = "visible";
			}
		}
	}

	for(let child of pagination) {
		if(child === el.parentElement) {
			child.classList.add('active');
		} else {
			child.classList.remove('active');
		}
	}
}

//////////////////////////
// 5. Download Functions
//////////////////////////

// Configure download format of license
function setDownload(id, type) {
	let button = document.getElementById('downloadButton');

	if(downloadReady) {
		let link = url + id +"/generate?media_type=text/" + type.toString();
		console.log(link);
		button.href = link;

		if(button.classList.contains('disabled')) {
			button.classList.remove('disabled');
			button.classList.add('active');
		}
	}
}

// One-shot download link for PNG
function downloadURI(uri, name) {
    var link = document.createElement("a");
    link.download = name;
    link.href = uri;
    link.click();
    link.remove();
}

function downloadPNG() {
	console.log("Download Image Banner");
	let typeString = document.getElementById('license-type').innerHTML.toString();
	let nameString = document.getElementById('artefact_title').innerHTML.toString();
	let filename = 'banner_' + typeString + '_' + nameString + '.png';
	let banner = document.getElementById('banner');

	let clone = banner.cloneNode(true);
	clone.style.scale = "2";
	clone.style.width = "fit-content";

	document.body.appendChild(clone);

    html2canvas(clone, {
    	useCORS: true,
    	backgroundColor: null
    }).then(function (canvas) {
            let bannerImage = canvas.toDataURL("image/png");
            document.body.removeChild(clone);
            downloadURI(bannerImage, filename);
        }
    );
}