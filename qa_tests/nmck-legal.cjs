'use strict';
const assert=require('node:assert/strict');const R=require('../app/src/main/assets/review.js');
for(const offerRule of [true,false])for(const prices of [[100,110,120],[10,100,300],[100,100,100]]){
 const task={kind:'nmck',offerRule,rows:[{name:'Пример',quantity:3,prices}],questions:[{id:'total',answer:330}]};const out=R.facts(task).example;
 assert.match(out,/статья 22 Федерального закона № 44-ФЗ/);if(offerRule&&prices[0]===prices[1])assert.match(out,/Цены ниже средней нет/);
}
console.log('PASS: legal reference in NMCK conclusions, uniform and equal price cases');
