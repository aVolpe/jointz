import { expect } from 'chai';
import { assert, IsExact } from 'conditional-type-checks';
import { describe, it } from 'mocha';
import jointz, { ExtractResultType } from '../index';

describe('jointz#object', () => {
  it('expects objects', () => {
    expect(jointz.object({}).validate([]))
      .to.deep.eq([ { message: 'must be an object', path: [], value: [] } ]);
    expect(jointz.object({}).validate('abc'))
      .to.deep.eq([ { message: 'must be an object', path: [], value: 'abc' } ]);
    expect(jointz.object({}).validate(123))
      .to.deep.eq([ { message: 'must be an object', path: [], value: 123 } ]);
  });

  it('allowUnknownKeys can be set to false to prevent unknown keys', () => {
    expect(jointz.object({}).allowUnknownKeys(false).validate({ abc: 123 }))
      .to.deep.eq([ { message: 'encountered unknown key "abc"', path: [], value: { abc: 123 } } ]);
  });

  it('checks keys', () => {
    expect(jointz.object({ abc: jointz.number() }).requiredKeys('abc').validate({}))
      .to.deep.eq([ { message: 'required key "abc" was not defined', path: [], value: {} } ]);

    expect(jointz.object({ abc: jointz.number() }).requiredKeys('abc').validate({ abc: 'hello' }))
      .to.deep.eq([ { message: 'must be a number', path: [ 'abc' ], value: 'hello' } ]);
  });

  it('works with nested objects', () => {
    const nested = jointz.object({
      abc: jointz.object({ def: jointz.number() }).requiredKeys('def')
    }).requiredKeys('abc');

    expect(nested.validate({ abc: {} }))
      .to.deep.eq([ { message: 'required key "def" was not defined', path: [ 'abc' ], value: {} } ]);
    expect(nested.validate({ abc: { def: 'string' } }))
      .to.deep.eq([ { message: 'must be a number', path: [ 'abc', 'def' ], value: 'string' } ]);
  });

  describe('#allowUnknownKeys', () => {
    it('results in errors if unknown keys present', () => {
      expect(jointz.object({}).allowUnknownKeys(false).validate({ abc: 123 }))
        .to.deep.eq([ { message: 'encountered unknown key "abc"', path: [], value: { abc: 123 } } ]);
    });
  });

  describe('#requiredKeys', () => {
    it('does not duplicate messages for duplicate required keys', () => {
      expect(
        jointz.object({ 'abc': jointz.any() }).requiredKeys('abc').validate({})
      ).to.deep.eq([ { message: 'required key "abc" was not defined', path: [], value: {} } ]);
    });
  });

  it('can have keys specified', () => {
    expect(jointz.object({ abc: jointz.constant('def') }).validate({ abc: 'def' }))
      .to.be.an('array').with.length(0);

    expect(jointz.object({ abc: jointz.constant('def') }).validate({ abc: 'red' }))
      .to.deep.eq([ { message: 'must be one of "def"', path: [ 'abc' ], value: 'red' } ]);
  });

  it('isValid typeguards properly', () => {
    const validator = jointz.object({ name: jointz.string() });

    const value: unknown = { name: 'abc' };

    expect(validator.isValid(value)).eq(true);

    if (validator.isValid(value)) {
      expect(value.name).to.eq('abc');
    }
  });

  it('type extracted from object that allows unknown keys allows any other key', () => {
    const validator = jointz.object({ abc: jointz.constant('def') }).allowUnknownKeys(true);

    type validatorType = ExtractResultType<typeof validator>;

    const x: validatorType = { abc: 'def', ghi: 'fgh' };

    expect(x.ghi).to.eq('fgh');
  });

  it('isValid typeguards properly with nested objects', () => {
    const validator = jointz.object({ abc: jointz.object({ def: jointz.array(jointz.number()) }) });

    const value: unknown = { abc: { def: [ 3 ] } };

    expect(validator.isValid(value)).eq(true);

    if (validator.isValid(value)) {
      expect(value!.abc!.def![ 0 ].toFixed(0)).to.eq('3');
    }
  });

  describe('type checks', () => {

    it('produces optional keys by default', () => {
      const validator = jointz.object({
        abc: jointz.number()
      });

      assert<IsExact<ExtractResultType<typeof validator>, { abc?: number; }>>(true);
    });

    it('produces required keys if specified', () => {
      const validator = jointz.object({
        abc: jointz.number()
      }).requiredKeys('abc')
        .allowUnknownKeys(false);

      const x = {
        abc: 1,
        test: 'test'
      };

      assert<IsExact<typeof x, ExtractResultType<typeof validator>>>(false);
    });

    it('allows unknown keys when unknown', () => {
      const validator = jointz.object({
        abc: jointz.number()
      })
        .requiredKeys('abc')
        .allowUnknownKeys(true);

      assert<IsExact<keyof ExtractResultType<typeof validator>, string | number>>(true);
      assert<IsExact<ExtractResultType<typeof validator>['abc'], number>>(true);
    });

    it('does not allow unknown keys by default', () => {
      const validator = jointz.object({
        abc: jointz.number(),
        test: jointz.string()
      })
        .requiredKeys('abc');

      assert<IsExact<keyof ExtractResultType<typeof validator>, string | number>>(false);
      assert<IsExact<keyof ExtractResultType<typeof validator>, 'abc' | 'test'>>(true);
    });

    it('has the right shape', () => {
      const validator = jointz.object({
        abc: jointz.object({
          def: jointz.array(jointz.number())
        }).requiredKeys('def')
      }).requiredKeys('abc');

      assert<IsExact<ExtractResultType<typeof validator>, { abc: { def: number[] } }>>(true);
    });
  });
});
