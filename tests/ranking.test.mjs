import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,rank,validate} from '../public/model.mjs';

const task=(id,overrides={})=>({id,title:id,notes:'',done:false,benefit:5,penalty:5,cost:3,risk:3,due:'',deps:[],...overrides});

test('Wiegers weights produce the expected normalized priority',()=>{
 const result=rank([task('a',{benefit:8,penalty:4,cost:2,risk:1}),task('b',{benefit:4,penalty:2,cost:4,risk:3})],defaults);
 // A: value 20/30, cost 2/6, risk 1/4. B: value 10/30, cost 4/6, risk 3/4.
 assert.ok(Math.abs(result[0].base-16/11)<1e-12);
 assert.ok(Math.abs(result[1].base-8/25)<1e-12);
 assert.equal(result[0].id,'a');
});

test('deadline urgency remains a multiplier of the weighted base',()=>{
 const results=rank([task('late',{due:'2020-01-01'}),task('normal')],defaults,new Date('2026-01-01T12:00:00Z'));
 assert.equal(results[0].id,'late');
 assert.equal(results[0].score,results[0].base*3);
 assert.equal(results[1].score,results[1].base);
});

test('old equal weights migrate for saved lists and JSON imports',()=>{
 const original={version:1,tasks:[task('existing')],weights:{benefit:1,penalty:1,cost:1,risk:1}};
 const loaded=validate(original);
 assert.deepEqual(loaded.weights,{benefit:2,penalty:1,cost:1,risk:0.5});
 assert.equal(loaded.tasks[0].id,'existing');
 assert.equal(original.weights.benefit,1);
 assert.deepEqual(validate({version:1,tasks:[]}).weights,defaults);
});

test('explicit custom weights are preserved',()=>{
 const weights={benefit:3,penalty:2,cost:1,risk:0.25};
 assert.deepEqual(validate({version:1,tasks:[],weights}).weights,weights);
});

test('completed tasks are excluded from normalization',()=>{
 const results=rank([task('pending'),task('done',{done:true,benefit:10})],defaults);
 assert.ok(Math.abs(results[0].score-2/3)<1e-12);
 assert.equal(results[1].score,0);
 assert.deepEqual(rank([],defaults),[]);
});
