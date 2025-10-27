import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, CreateDateColumn } from 'typeorm'

@Entity()
export class Trade {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('varchar')
  state!: string

  @Column('float')
  ratio_target!: number

  @Column('float', { nullable: true })
  ratio_last!: number | null

  @Column('float')
  size!: number

  @Column('jsonb', { nullable: true })
  result!: any

  @CreateDateColumn()
  created_at!: Date

  @UpdateDateColumn()
  updated_at!: Date
}
